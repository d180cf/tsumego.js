/// <reference path="board.ts" />
/// <reference path="linalg.ts" />

module tsumego {
    import BitMatrix = linalg.BitMatrix;

    enum Tags {
        'X' = 0, // a stone of the same color
        'O' = 1, // a stone of the opposite color
        '-' = 2, // a neutral stone (the wall)
        '.' = 3, // a vacant intersection
    }

    const same = (m: BitMatrix, b: number) => (m.bits & b) === m.bits;

    /**
     * An example of a pattern:
     *
     *      X X ?
     *      O . X
     *      - - -
     *
     *  `X` = a stone of the same color
     *  `O` = a stone of the opposite color
     *  `.` = an empty intersection
     *  `-` = a neutral stone (the wall)
     *  `?` = anything (doesn't matter what's on that intersection)
     */
    export class Pattern {
        private masks = [new Array<BitMatrix>()]; // 8 elements

        static uceyes = [
            new Pattern([
                'XXX',
                'X.X',
                'XXX'
            ]),
            new Pattern([
                'XX?',
                'X.X',
                'XXX'
            ]),
            new Pattern([
                'XXX',
                'X.X',
                '---'
            ]),
            new Pattern([
                'XX-',
                'X.-',
                '---'
            ])
        ]

        // the constructor can be very slow as every pattern
        // is constructed only once before the solver starts
        constructor(data: string[]) {
            // m[0] = bits for X
            // m[1] = bits for O
            // m[2] = bits for -
            // m[3] = bits for .
            const m = this.masks;

            for (let i = 0; i < 4; i++)
                m[0].push(new BitMatrix(3, 3));

            for (let row = 0; row < data.length; row++) {
                for (let col = 0; col < data[row].length; col++) {
                    const tag = data[row].charAt(col).toUpperCase();
                    const mask = m[0][Tags[tag]];

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

        static take(board: Board, x0: number, y0: number, color: number) {
            // constructing and disposing an array at every call
            // might look very inefficient, but getting rid of it
            // by declaring this array as a variable outside the
            // method doesn't improve performance at all in V8
            const m = [0, 0, 0, 0];

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const x = x0 + j - 1;
                    const y = y0 + i - 1;
                    const c = board.get(x, y);
                    const b = 1 << (3 * i + j);

                    if (c * color > 0)
                        m[0] |= b; // a stone of the same color
                    else if (c * color < 0)
                        m[1] |= b; // a stone of the opposite color
                    else if (!board.inBounds(x, y))
                        m[2] |= b; // a neutral stone (the wall)
                    else
                        m[3] |= b; // a vacant intersection
                }
            }

            return m;
        }

        test(m: number[]) {
            search: for (let i = 0; i < 8; i++) {
                const w = this.masks[i];

                for (let j = 0; j < 4; j++)
                    if (!same(w[j], m[j]))
                        continue search;

                return true;
            }

            return false;
        }

        static isEye(board: Board, x: XIndex, y: YIndex, color: Color) {
            const snapshot = Pattern.take(board, x, y, color);
            const patterns = Pattern.uceyes;

            // for..of would create an iterator and make
            // the function about 2x slower overall
            for (let i = 0; i < patterns.length; i++)
                if (patterns[i].test(snapshot))
                    return true;

            return false;
        }
    }
}
