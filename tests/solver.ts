/// <reference path="infra.ts" />

module tests {
    /** [ number of b stones - number of w stones, unique tag ] */
    type Hash =[number, number];

    /** +1 - b wins
     *  -1 - w wins
     *   0 - the status isn't clear */
    type Status = number;

    type Node = tsumego.Hasheable;

    class GameGraph {
        root: Node;

        private nodes: { [hash: string]: Node } = {};
        private moves: { [hash: string]: string[] } = {};
        private state: { [hash: string]: Status } = {};

        constructor(status: Status, build: GameGraph.Builder) {
            const hash: Hash = [0, 0];
            this.init(hash, status, build);
            this.root = this.nodes[hash + ''];
        }

        private init(hash: Hash, status: Status, build: GameGraph.Builder) {
            const moves = [];

            this.nodes[hash + ''] = new GameGraph.Node(hash + '');
            this.moves[hash + ''] = moves;
            this.state[hash + ''] = status;

            if (!build)
                return;

            build((h, s, b) => {
                if (moves.indexOf(h + '') >= 0)
                    throw Error(h + ' already added');

                if (h[0] == hash[0])
                    throw Error(hash + ' -> ' + h + ' adds neither b nor w stones');

                moves.push(h + '');

                if ((h + '') in this.nodes) {
                    // adding a link to an existing node
                    // which creates a loop in the graph
                    if (s !== void 0 || b !== void 0)
                        throw Error(h + ' already has a status');
                } else {
                    if (s === void 0)
                        throw Error(h + ' is a new node and must have a status');

                    this.init(h, s, b);
                }
            });
        }

        solve(p: Hash[], color: number, nkt: number) {
            return tsumego.solve(
                !p ? [this.root] : p.map(h => this.nodes[h + '']),
                color,
                nkt,
                new tsumego.TT,
                (b, c) => this.generate(b, c),
                b => this.estimate(b));
        }

        generate(b: Node, c: number) {
            const h0 = b.hash();
            const [nbw0] = h0.split(',');
            const ms = this.moves[h0];

            if (typeof ms === 'number') {
                throw Error(b.hash() + ' has a known status');
            } else {
                return ms.map(h => {
                    const [nbw, tag] = h.split(',');

                    return {
                        b: this.nodes[h],
                        c: +nbw - +nbw0,
                        m: { x: +tag, y: +tag }
                    };
                }).filter(w => {
                    return c * w.c > 0;
                });
            }
        }

        estimate(b: Node): Status {
            const h = b.hash();
            const s = this.state[h];
            if (typeof s !== 'number')
                throw Error(h + ' doesnt have a status');
            return s;
        }
    }

    module GameGraph {
        export interface Builder {
            (add: (hash: Hash, status?: Status, build?: Builder) => void): void;
        }

        export class Node implements tsumego.Hasheable {
            constructor(private _hash: string) {
            }

            hash() {
                return this._hash;
            }
        }
    }

    ut.group($ => {
        $.test($ => {
            const g = new GameGraph(-1, add => {
                add([+1, 111], +1);
                add([-1, 222], -1);
            });

            $(g.solve(null, +1, 0)).equal({
                color: +1,
                move: { x: 111, y: 111 }
            });

            $(g.solve(null, -1, 0)).equal({
                color: -1,
                move: { x: 222, y: 222 }
            });
        });

        $.test($ => {
            const g = new GameGraph(-1, add => {
                add([+1, 111], -1, add => {
                    add([0, 0]);
                    add([+2, 222], +1);
                });
            });

            $(g.solve(null, +1, 0)).equal({
                color: +1,
                repd: 1,
                move: { x: 111, y: 111 }
            });

            $(g.solve(null, +1, -1)).equal({
                color: -1
            });
        });
    });
}