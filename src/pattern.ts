/// <reference path="board.ts" />

module tsumego {
    export class Pattern {
        data: string;

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

        public test(board: Board, x: XIndex, y: YIndex, color: Color): boolean {
            var $ = this, tms = Pattern.tms, k, m;

            for (k = 0; k < tms.length; k++) {
                m = tms[k];
                if ($.testrm(board, x, y, color, m[0], m[1], m[2], m[3]))
                    return true;
            }

            return false;
        }

        testrm(board: Board, x: XIndex, y: YIndex, color: Color, mxx: number, mxy: number, myx: number, myy: number): boolean {
            var $ = this, data = $.data, i, j, c, d;

            for (i = -1; i <= 1; i++) {
                for (j = -1; j <= 1; j++) {
                    c = board.at(x + i, y + j);
                    d = data[i * mxx + j * mxy + 1 + 3 * (i * myx + j * myy + 1)];

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
            var i;

            for (i = 0; i < Pattern.uceyes.length; i++)
                if (Pattern.uceyes[i].test(board, x, y, color))
                    return true;

            return false;
        }
    }
}