module tsumego {
    export var _en_calls = 0;
    export var _en_stones = 0;
    export var _en_blocks = 0;
    export var _en_area_x = 0;
    export var _en_area_y = 0;

    /**
     * Estimates the "eyeness" of the group.
     *
     * This function is trivial, in fact:
     *
     *          (n1 + q * n2 - n3) / 4
     *
     *  n1 = the number of 2x2 blocks with 1 stone of the same color
     *  n2 = 2x2s with 2 stones placed diagonally
     *  n3 = 2x2s with 3 stones
     *
     * However recomputing this function every time
     * would be too slow, hence here it's its incremental
     * version that checks what has changed on the board
     * since last time it was invoked.
     *
     * Erik van der Werf. "AI techniques for the game of Go"
     * erikvanderwerf.tengen.nl/pubdown/thesis_erikvanderwerf.pdf
     */
    export class EulerN {
        reset: () => number;
        value: (move: stone, nres: number) => number;

        constructor(board: Board, color: number, q = 2) {
            const size = board.size;

            // [-1..size+1]x[-1..size+1]
            const snapshot: block[] = []; // 0, 1
            const values: number[] = []; // 0, 1, 2, 3

            for (let y = -1; y <= size; y++) {
                for (let x = -1; x <= size; x++) {
                    snapshot.push(0);
                    values.push(0);
                }
            }

            function offset(x: number, y: number) {
                return (size + 2) * (y + 1) + x + 1;
            }

            function test(x, y) {
                return board.get(x, y) * color > 0 ? 1 : 0;
            }

            function value(offset: number) {
                const a = snapshot[offset];
                const b = snapshot[offset + 1];
                const c = snapshot[offset + size + 2];
                const d = snapshot[offset + size + 3];

                return value4(a, b, c, d);
            }

            // accepts four 0..1 values
            function value4(a, b, c, d) {
                const v = a + b + c + d;

                return v != 2 || a == d ? (v & 3) : 0;
            }

            const cf = [0, 1 / 4, q / 4, -1 / 4];

            let base = 0; // assigned by reset(), adjusted by value(...)

            return {
                reset() {
                    const [xmin, xmax, ymin, ymax] = block.dims(board.rect(color));

                    for (let y = ymin - 1; y <= ymax; y++)
                        for (let x = xmin - 1; x <= xmax; x++)
                            snapshot[offset(x, y)] = test(x, y);

                    base = 0;

                    for (let y = ymin - 1; y <= ymax; y++) {
                        for (let x = xmin - 1; x <= xmax; x++) {
                            const i = offset(x, y);
                            const v = value(i);

                            values[i] = v;
                            base += cf[v];
                        }
                    }

                    return base;
                },

                value(move: stone, nres: number) {
                    _en_calls++;

                    // adding a stone of the opposite color
                    // that doesn't capture anything won't
                    // change the euler number
                    if (move * color < 0 && nres < 2)
                        return base;

                    // it gets here in 62% of cases
                    _en_stones += nres;

                    const mx = stone.x(move);
                    const my = stone.y(move);

                    // the area that has been affected by this move
                    let rect = block.make(mx, mx, my, my, 0, 0, 0);

                    // add all captured blocks
                    if (move * color < 0) {
                        const blocks = board.getRemovedBlocks();

                        _en_blocks += blocks.length;

                        // blocks.length = 0.13 on average
                        for (let i = 0; i < blocks.length; i++)
                            rect = block.join(rect, blocks[i]);
                    }

                    // the area size is 0.85 x 0.77 on average
                    const [xmin, xmax, ymin, ymax] = block.dims(rect);

                    _en_area_x += xmax - xmin + 1;
                    _en_area_y += ymax - ymin + 1;

                    const area_x = xmax - xmin + 3; // 2.85
                    const area_y = ymax - ymin + 3; // 2.77

                    // since the area is so small on average,
                    // all its contents can be represented as
                    // bits in one number: in fact, a 32 bit
                    // number has 4x more room than needed, as
                    // only 8 bits are occupied in it on average
                    let area: number = 0;

                    // the loop is reversed to place bits in the direct order:
                    // (dx, dy) should map to the (dy * area_x + dx)-th bit
                    //
                    //      a b c
                    //      d e f   -->  0 b i h g f e d c b a
                    //      g h i
                    //
                    //      0 0 1
                    //      1 0 1   -->  0 b 0 1 1 1 0 1 1 0 0 = 236
                    //      1 1 0
                    //
                    for (let y = ymin + 1; y >= ymin - 1; y--)
                        for (let x = xmin + 1; x >= xmin - 1; x--)
                            area = area << 1 | test(x, y);

                    let diff = 0;

                    for (let y = ymin - 1; y <= ymax; y++) {
                        for (let x = xmin - 1; x <= xmax; x++) {
                            const k = area_x * (y - ymin + 1) + x - xmin + 1;

                            const a = area >> k & 1;
                            const b = area >> k + 1 & 1;
                            const c = area >> k + area_x & 1;
                            const d = area >> k + area_x + 1 & 1;

                            const v = value4(a, b, c, d);
                            const i = offset(x, y);

                            if (v != values[i])
                                diff += cf[v] - cf[values[i]];
                        }
                    }

                    return base + diff;
                }
            }
        }
    }
}
