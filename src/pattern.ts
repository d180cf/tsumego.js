﻿/// <reference path="board.ts" />
/// <reference path="linalg.ts" />

module tsumego {
    'use strict';

    import BitMatrix = linalg.BitMatrix;

    enum Tags {
        'X' = 0, // a stone of the same color
        'O' = 1, // a stone of the opposite color
        '-' = 2, // a neutral stone (the wall)
        '.' = 3, // a vacant intersection
    }

    const same = (m: BitMatrix, b: number) => (m.bits & b) === m.bits;

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
        constructor(data: string[]) {
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

            for (let i = 0; i < 3; i++)
                m.push(m[i].map(m => m.r));

            for (let i = 0; i < 4; i++)
                m.push(m[i].map(m => m.t));
        }

        static take(board: Board, x0: number, y0: number, color: number) {
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

        static isEye = profile._time('Pattern.isEye', (board: Board, x: XIndex, y: YIndex, color: Color) => {
            const snapshot = Pattern.take(board, x, y, color);
            const patterns = Pattern.uceyes;

            for (let i = 0; i < patterns.length; i++)
                if (patterns[i].test(snapshot))
                    return true;

            return false;
        });
    }
}
