/// <reference path="board.ts" />

module tsumego {
    'use strict';

    export class Pattern {
        private bits_f = 0; // friendly stones
        private bits_e = 0; // enemy stones
        private bits_n = 0; // neutral stones (the walls)
        private bits_v = 0; // vacant intersections

        static tms = [
            [+1, 0, 0, +1],

            [-1, 0, 0, +1], // x inverted
            [+1, 0, 0, -1], // y inverted

            [0, -1, +1, 0], // 90 degrees ccw
            [-1, 0, 0, -1], // 180 degrees ccw
            [0, +1, -1, 0], // 270 degrees ccw
        ]

        static uceyes = [
            new Pattern(['XXX', 'X.X', 'XXX']), // center
            new Pattern(['XX?', 'X.X', 'XXX']), // center
            new Pattern(['XXX', 'X.X', '---']), // side
            new Pattern(['XX-', 'X.-', '---']) // corner
        ]

        /**
         * An example of a pattern:
         *
         *      X X ?
         *      O . X
         *      - - -
         *  `X` = a stone of the same color
         *  `O` = a stone of the opposite color
         *  `.` = an empty intersection
         *  `-` = a neutral stone (the wall)
         *  `?` = anything (doesn't matter what's on that intersection)
         */
        constructor(rows: string[]) {
            let i = 0, q = 1 << 9;

            for (const row of rows) {
                for (const tag of row.toUpperCase()) {
                    switch (tag) {
                        case 'X':
                            this.bits_f |= q;
                            break;
                        case 'O':
                            this.bits_e |= q;
                            break;
                        case '-':
                            this.bits_n |= q;
                            break;
                        case '.':
                            this.bits_v |= q;
                            break;
                    }

                    this.bits_f >>= 1;
                    this.bits_e >>= 1;
                    this.bits_v >>= 1;
                    this.bits_n >>= 1;
                }
            }
        }

        @profile.time
        test(board: Board, x: XIndex, y: YIndex, color: Color): boolean {
            for (let i = 0; i < 6; i++) {
                const m = Pattern.tms[i];
                if (this.testrm(board, x, y, color, m[0], m[1], m[2], m[3]))
                    return true;
            }

            return false;
        }

        private testrm(board: Board, x: XIndex, y: YIndex, color: Color, mxx: number, mxy: number, myx: number, myy: number): boolean {
            const n = board.size;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const x1 = x + i;
                    const y1 = y + j;
                    const wall = x1 < 0 || x1 >= n || y1 < 0 || y1 >= n;
                    const c = board.get(x1, y1);
                    const bitm = 1 << (i * mxx + j * mxy + 1 + 3 * (i * myx + j * myy + 1));

                    if ((this.bits_f & bitm) && (!c || (c ^ color) < 0) ||
                        (this.bits_e & bitm) && (!c || (c ^ color) > 0) ||
                        (this.bits_v & bitm) && (c || wall) ||
                        (this.bits_n & bitm) && !wall)
                        return false;
                }
            }

            return true;
        }

        static isEye(board: Board, x: XIndex, y: YIndex, color: Color): boolean {
            for (const p of Pattern.uceyes)
                if (p.test(board, x, y, color))
                    return true;

            return false;
        }
    }
}
