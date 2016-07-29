/// <reference path="board.ts" />
/// <reference path="linalg.ts" />

module tsumego {
    import BitMatrix = linalg.BitMatrix;

    enum tags {
        'x' = 0, // a stone of the same color
        'o' = 1, // a stone of the opposite color
        '#' = 2, // a neutral stone (the wall)
        '-' = 3, // a vacant intersection
        'X' = 4, // a safe stone of the same color
        'O' = 5, // a safe stone of the opposite color
        max = 6
    }

    const same = (m: BitMatrix, b: number) => (m.bits & b) === m.bits;

    /**
     * An example of a pattern:
     *
     *      x x ?
     *      o - x
     *      # # #
     *  
     * The current implementation uses bitmasks and the fact that patterns
     * are only 3x3 with the middle point empty at the moment. A probably
     * better and more scalable approach would be a DFA matcher:
     * www.gnu.org/software/gnugo/gnugo_10.html
     * www.delorie.com/gnu/docs/gnugo/gnugo_160.html
     */
    export class Pattern {
        private masks = [new Array<BitMatrix>()]; // 8 elements

        // the constructor can be very slow as every pattern
        // is constructed only once before the solver starts
        constructor(data: string[]) {
            // m[0][t] = bitmask for tags[t]
            // m[t] = the t-th transform of m[0]
            const m = this.masks;

            for (let i = 0; i < tags.max; i++)
                m[0].push(new BitMatrix(3, 3));

            for (let row = 0; row < data.length; row++) {
                const line = data[row].replace(/\s/g, '');

                for (let col = 0; col < line.length; col++) {
                    const chr = line[col];

                    if (chr == '?')
                        continue;

                    const tag = tags[chr];

                    if (tag === undefined)
                        throw SyntaxError(`Invalid char ${chr} at ${row}:${col} in [${data.join(' | ')}]`);

                    const mask = m[0][tag];

                    if (mask)
                        mask.set(row, col, true);
                }
            }

            // Now we need to come up with all sane transformations
            // of the given pattern: reflections, rotations and so on.
            // There are four such transformations:
            //
            //  T = transposition
            //  R = rotation by 90 degress counter clock wise
            //  H = horizontal reflection
            //  V = vertical reflection
            //
            // It can be noted that V = TR and H = RT which means that
            // T and R are enough to construct all the transformations.
            // Since RRRR = 1 (rotation by 360 degrees), the first four
            // patterns form a ring: m, Rm, RRm, RRRm. Applying T gives
            // the second ring: TRm, TRRm, TRRRm. Since TT = 1, it can
            // be easily proven that these 8 patterns form a closed group
            // over T and R operators.

            for (let i = 0; i < 3; i++)
                m.push(m[i].map(m => m.r));

            for (let i = 0; i < 4; i++)
                m.push(m[i].map(m => m.t));
        }

        static take(board: Board, x0: number, y0: number, color: number, safe?: (s: stone) => boolean) {
            // constructing and disposing an array at every call
            // might look very inefficient, but getting rid of it
            // by declaring this array as a variable outside the
            // method doesn't improve performance at all in V8
            const m = [];

            for (let i = 0; i < tags.max; i++)
                m.push(0);

            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const x = x0 + dx - 1;
                    const y = y0 + dy - 1;
                    const c = board.get(x, y);
                    const s = stone.make(x, y, c);
                    const b = 1 << (3 * dy + dx);

                    if (c * color > 0) {
                        // a stone of the same color
                        m[0] |= b;

                        // a safe stone of the same color
                        if (safe && safe(s))
                            m[4] |= b;
                    } else if (c * color < 0) {
                        // a stone of the opposite color
                        m[1] |= b;

                        // a safe stone of the same color
                        if (safe && safe(s))
                            m[5] |= b;
                    } else if (!board.inBounds(x, y)) {
                        // a neutral stone (the wall)
                        m[2] |= b;
                    } else {
                        // a vacant intersection
                        m[3] |= b;
                    }
                }
            }

            return m;
        }

        test(m: number[]) {
            // for .. of here makes the entires solver 1.12x slower
            search: for (let i = 0; i < 8; i++) {
                const w = this.masks[i];

                for (let j = 0; j < tags.max; j++)
                    if (!same(w[j], m[j]))
                        continue search;

                return true;
            }

            return false;
        }
    }
}
