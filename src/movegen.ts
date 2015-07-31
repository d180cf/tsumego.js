module tsumego {
    'use strict';

    export interface Generator<Node, Move> {
        (node: Node, color: number): { b: Node; m: Move }[];
    }

    export module generators {
        /** Basic moves generator. Tries to maximize libs. */
        export function Basic(rzone: XY[]): Generator<Board, XY> {
            return (board: Board, color: number) => {
                const leafs = [];

                let forked: Board;

                for (let m of rzone) {
                    if (!Pattern.isEye(board, m.x, m.y, color)) {
                        const b = forked || board.fork();
                        const r = b.play(m.x, m.y, color);

                        if (!r) {
                            forked = b;
                            continue;
                        }

                        forked = null;

                        leafs.push({
                            b: b,
                            m: m,
                            r: r,
                            n1: b.totalLibs(color),
                            n2: b.totalLibs(-color),
                        });
                    }
                }

                leafs.sort((a, b) => {
                    return (b.r - a.r)      // maximize the number of captured stones first
                        || (b.n1 - a.n1)    // then maximize the number of liberties
                        || (a.n2 - b.n2);   // then minimize the number of the opponent's liberties
                });

                return leafs;
            };
        }
    }
}
