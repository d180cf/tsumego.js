module tsumego {
    'use strict';

    export interface Generator<Node, Move> {
        (node: Node, color: number): { b: Node; m: Move }[];
    }

    export module generators {
        /** Basic moves generator. Tries to maximize libs. */
        export function Basic(rzone: XY[]): Generator<Board, XY> {
            const random = rand.LCG.NR01(Date.now());

            return (board: Board, color: number) => {
                const leafs = [];

                let forked: Board;

                for (const m of rzone) {
                    const x = XY.x(m);
                    const y = XY.y(m);

                    if (!Pattern.isEye(board, x, y, color)) {
                        const b = forked || board.fork();
                        const r = b.play(x, y, color);

                        if (!r) {
                            forked = b;
                            continue;
                        }

                        forked = null;

                        leafs.push({
                            b: b,
                            m: m,
                            r: r,
                            n1: sumlibs(b, color),
                            n2: sumlibs(b, -color),
                        });
                    }
                }

                leafs.sort((a, b) => {
                    return (b.r - a.r)      // maximize the number of captured stones first
                        || (b.n1 - a.n1)    // then maximize the number of liberties
                        || (a.n2 - b.n2)    // then minimize the number of the opponent's liberties
                        || random() - 0.5;
                });

                return leafs;
            };
        }
    }

    export function sumlibs(board: Board, color: number) {
        let outer = 0;

        for (let i = 1; i < board.blocks.length; i++) {
            const b = board.blocks[i];

            if (block.size(b) > 0 && b * color > 0)
                outer = outer ? block.join(outer, b) : b;
        }

        let [xmin, xmax, ymin, ymax] = block.rect(outer);

        if (xmin > 0) xmin--;
        if (ymin > 0) ymin--;
        if (xmax < board.size - 1) xmax++;
        if (ymax < board.size - 1) ymax++;

        let total = 0;

        for (let x = xmin; x <= xmax; x++) {
            for (let y = ymin; y <= ymax; y++) {
                if (!board.get(x, y)) {
                    const isnb =
                        board.get(x - 1, y) * color > 0 ||
                        board.get(x + 1, y) * color > 0 ||
                        board.get(x, y - 1) * color > 0 ||
                        board.get(x, y + 1) * color > 0;

                    if (isnb)
                        total++;
                }
            }
        }

        return total;
    }

    export function eulern(board: Board, color: number, q: number = 2) {
        let n1 = 0, n2 = 0, n3 = 0;

        for (let x = -1; x <= board.size; x++) {
            for (let y = -1; y <= board.size; y++) {
                const a = +((board.get(x, y) * color) > 0);
                const b = +((board.get(x + 1, y) * color) > 0);
                const c = +((board.get(x + 1, y + 1) * color) > 0);
                const d = +((board.get(x, y + 1) * color) > 0);

                switch (a + b + c + d) {
                    case 1: n1++; break;
                    case 2: if (a == c) n2++; break;
                    case 3: n3++; break;
                }
            }
        }

        return (n1 - n3 + q * n2) / 4;
    }
}
