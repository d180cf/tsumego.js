/// <reference path="board.ts" />

module tsumego {
    'use strict';

    export class Pattern {
        private data: string;

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

        constructor(data: string[]) {
            this.data = data.join('');
        }

        @profile.time
        test(board: Board, x: XIndex, y: YIndex, color: Color): boolean {
            for (const m of Pattern.tms)
                if (this.testrm(board, x, y, color, m[0], m[1], m[2], m[3]))
                    return true;

            return false;
        }

        private testrm(board: Board, x: XIndex, y: YIndex, color: Color, mxx: number, mxy: number, myx: number, myy: number): boolean {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const c = board.get(x + i, y + j);
                    const d = this.data.charAt(i * mxx + j * mxy + 1 + 3 * (i * myx + j * myy + 1));

                    if (d == 'X' && (!c || (c ^ color) < 0) ||
                        d == 'O' && (!c || (c ^ color) > 0) ||
                        d == '.' && (c || !board.inBounds(x + i, y + j)) ||
                        d == '-' && board.inBounds(x + i, y + j))
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
