module tsumego {
    function findrepd(path: Board[], b: Board): number {
        for (let i = path.length - 1; i > 0; i--)
            if (b.hash() == path[i - 1].hash())
                return i;
        return infty;
    }

    interface Leaf<Node> {
        b: Node;
        m: XYIndex;
        r: number;
        n1: number;
        n2: number;
        ko: boolean;
    }

    export interface Generator<Node> {
        (path: Node[], rzone: XYIndex[], color, nkt: number): {
            leafs: Leaf<Node>[];
            mindepth: number
        };
    }

    export module generators {
        /** Basic moves generator. Tries to maximize libs. */
        export function basic(path: Board[], rzone: XYIndex[], color, nkt: number) {
            const depth = path.length;
            const board = path[depth - 1];
            const leafs: Leaf<Board>[] = [];

            let mindepth = infty;
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

                    const d = findrepd(path, b);
                    const ko = d < depth;

                    if (d < mindepth)
                        mindepth = d;

                    // the move makes sense if it doesn't repeat
                    // a previous position or the current player
                    // has a ko treat elsewhere on the board and
                    // can use it to repeat the local position
                    if (!ko || color * nkt > 0) {
                        leafs.push({
                            b: b,
                            m: m,
                            r: r,
                            ko: ko,
                            n1: b.totalLibs(color),
                            n2: b.totalLibs(-color),
                        });
                    }
                }
            }

            leafs.sort((a, b) => {
                return (+a.ko - +b.ko)          // moves that require a ko treat are considered last
                    || (b.r - a.r)              // then maximize the number of captured stones
                    || (b.n1 - a.n1)            // then maximize the number of liberties
                    || (a.n2 - b.n2)            // then minimize the number of the opponent's liberties
                    || (Math.random() - 0.5);   // otherwise try moves in a random order
            });

            return { leafs: leafs, mindepth: mindepth };
        }
    }
}
