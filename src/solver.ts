/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />

module tsumego {
    interface Estimator<Node> {
        (board: Node): number;
    }

    export interface Player {
        play(color: Color, move: Coords): void;
        undo(): void;
        done(color: Color, move: Coords, comment: string): void;
        loss(color: Color, move: Coords, response: Coords): void;
    }

    export class Solver<Node extends HasheableNode> {
        path: Node[] = [];

        /** tags[i] contains tags for path[i] */
        tags: {
            /** Present if the node is solved. */
            res?: Result;
            /** who plays */
            color: Color;
            /** how many external ko treats */
            nkt: number;
            /** which move led to this position */
            move?: Coords;
            /** whether the player has passed already */
            passed?: boolean;
            /** possible continuations */
            next?: { node: Node, move: Coords, nkt: number }[];
            /** the earliest node repeated by the continuations */
            mindepth?: number;
        }[] = [];

        get depth() {
            return this.path.length;
        }

        get current() {
            return this.tags[this.depth - 1];
        }

        constructor(path: Node[], color: Color, nkt: number,
            private tt: TT,
            private expand: Generator<Node>,
            private status: Estimator<Node>,
            private player?: Player) {
            for (const b of path) {
                this.path.push(b);
                this.tags.push(null);
            }

            this.tags[this.tags.length - 1] = {
                color: color,
                nkt: nkt
            };
        }

        next(): void {
            const node = this.path[this.depth - 1];
            const {color, nkt, res} = this.current;

            if (res) {
                this.exit();
                return;
            }

            const t = this.current;

            if (!t.next) {
                const {leafs, mindepth} = this.expand(this.path, color, nkt);

                t.next = leafs.map($ => {
                    return {
                        node: $.b,
                        move: $.m,
                        nkt: $.ko ? nkt - color : nkt
                    };
                }).reverse();

                t.mindepth = mindepth;
            }

            this.pick();
        }

        private pick(): void {
            const node = this.path[this.depth - 1];
            const {color, nkt, passed, move, next} = this.current;

            if (next.length > 0) {
                const {move, nkt, node} = next.pop();
                this.play(node, move, color, nkt);
            } else if (passed) {
                this.done({ color: -color, move: move, repd: infty }, Color.alias(color) + ' is out of moves');
            } else {
                const prev = this.tags[this.depth - 2];

                if (prev && prev.passed) {
                    this.done({ color: this.status(node), repd: infty }, 'both passed');
                } else {
                    this.current.passed = true;
                    this.play(node, null, color, nkt);
                }
            }
        }

        private play(node: Node, move: Coords, color: Color, nkt: number): void {
            const ttres = this.tt.get(node, -color, nkt);

            if (ttres) {
                if (ttres.color * color > 0)
                    this.done(ttres, 'cached result');
                else if (this.player)
                    this.player.loss(color, move, ttres.move);
            } else if (this.status(node) > 0) {
                this.done({ color: +1, move: move, repd: infty });
            } else {
                this.path.push(node);
                this.tags.push({ color: -color, nkt: nkt, move: move });

                if (this.player)
                    this.player.play(color, move);
            }
        }

        private done(r: Result, comment?: string) {
            this.current.res = r;

            if (this.player)
                this.player.done(r.color, r.move, comment);
        }

        private exit(): void {
            const node = this.path[this.depth - 1];
            const {color, nkt, mindepth, res} = this.current;

            if (color * res.color < 0)
                res.repd = mindepth;

            if (res.repd > this.depth)
                this.tt.set(node, color, res, nkt);

            this.path.pop();
            this.tags.pop();

            if (this.player) {
                const move = res.move;
                this.done(res);
                this.player.undo();
            }

            if (!this.current)
                return;

            if (this.current.color * res.color > 0) {
                this.done(res);
                return;
            }

            this.pick();
        }
    }
}
