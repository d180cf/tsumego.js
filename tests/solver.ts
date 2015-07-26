/// <reference path="infra.ts" />

module tests {
    /** 
     * [ number of b stones,
     *   number of w stones,
     *   unique tag ]
     */
    type Hash =[number, number, number];

    /** +1 - b wins
     *  -1 - w wins
     *   0 - the status isn't clear */
    type Status = number;

    type Node = tsumego.Hasheable;

    class Graph {
        root: Node = Graph.Node('x,x,777');
        nodes: { [hash: string]: Node } = {};
        moves: { [hash: string]: Status|string[] } = {};

        constructor(build: (add: Graph.Builder) => void) {
            const node = this.root;

            build((hash, next) => {
                this.nodes[hash] = this.nodes[hash] || Graph.Node(hash + '');
                
            });
        }

        solve(p: Hash[], color: number, nkt: number) {
            return tsumego.solve(
                !p ? [this.root] : p.map(h => this.nodes[h + '']),
                color,
                nkt,
                new tsumego.TT,
                b => this.generate(b),
                b => this.estimate(b));
        }

        generate(b: Node) {
            const ms = this.moves[b.hash()];

            if (typeof ms === 'number') {
                throw Error(b.hash() + ' has a known status');
            } else {
                return ms.map(h => {
                    const tag = +h.split(',')[2];

                    return {
                        b: this.nodes[h],
                        m: { x: tag, y: tag }
                    };
                });
            }
        }

        estimate(b: Node) {
            const s = this.moves[b.hash()];
            return typeof s === 'number' ? s : 0;
        }
    }

    module Graph {
        export interface Builder {
            (hash: Hash, status: Status): void;
            (hash: Hash, build?: Builder): void;
        }

        export const Node = (hash: string) => ({ hash: () => hash });
    }

    ut.group($ => {
        $.test($ => {
            const g = new Graph(add => {
                add([1, 0, 111], +1);
                add([1, 0, 222], -1);
            });

            $(g.solve(null, +1, 0)).equal({ color: +1, move: { x: 111, y: 111 } });
            $(g.solve(null, -1, 0)).equal({ color: -1, move: { x: 222, y: 222 } });
        });
    });
}