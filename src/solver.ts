/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />

module tsumego {
    interface Estimator<Node> {
        (board: Node): number;
    }

    export interface Player {
        /** c plays at (x, y) */
        play(x: number, y: number, c: number): void;
        /** c passes */
        pass(c: number): void;
        /** c wins by playing at (x, y) */
        undo(x: number, y: number, c: number): void;
    }

    export class Solver<Node extends HasheableNode> {
        private path: Node[] = [];

        /** tags[i] contains tags for path[i] */
        private tags: {
            /** who plays */
            color: Color;
            /** how many external ko treats */
            nkt: number;
            /** which move led to this position */
            move?: Coords;
            /** possible continuations */
            next?: { node: Node, move: Coords, nkt: number }[];
            /** the earliest node repeated by the continuations */
            mindepth?: number;
        }[] = [];

        private get depth() {
            return this.path.length;
        }

        private get current() {
            const d = this.path.length;
            const t = this.tags[d - 1];
            return { node: this.path[d - 1], color: t.color, nkt: t.nkt, next: t.next, move: t.move, mindepth: t.mindepth };
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

        next(): Result {
            const {color, nkt, node} = this.current;
            const ttres = this.tt.get(node, color, nkt);

            if (ttres)
                return this.exit(ttres);

            if (this.status(node) > 0)
                return this.exit({ color: +1, repd: infty });

            const {leafs, mindepth} = this.expand(this.path, color, nkt);
            const t = this.tags[this.depth - 1];

            t.next = leafs.map($ => ({
                node: $.b,
                move: $.m,
                nkt: $.ko ? nkt - color : nkt
            }));

            t.mindepth = mindepth;
            return this.pick();
        }

        private pick(): Result {
            const {next, color, nkt, move, node} = this.current;

            if (next.length > 0) {
                const {node, move} = next.splice(0, 1)[0];
                this.path.push(node);
                this.tags.push({ color: -color, nkt: nkt, move: move });

                if (this.player)
                    this.player.play(move.x, move.y, color);

                return { color: 0, repd: 0 };
            }

            if (move) {
                this.path.push(node);
                this.tags.push({ color: -color, node: node, nkt: nkt });

                if (this.player)
                    this.player.pass(color);

                return { color: 0, repd: 0 };
            }

            return this.exit({ color: this.status(node), repd: infty });
        }

        private exit(res: Result): Result {
            const {node, color, nkt, mindepth} = this.current;

            if (color * res.color < 0)
                res.repd = mindepth;

            if (res.repd > this.depth)
                this.tt.set(node, color, res, nkt);

            this.path.pop();
            this.tags.pop();

            if (this.player)
                this.player.undo(res.move && res.move.x, res.move && res.move.y, res.color);

            if (this.current.color * res.color > 0)
                return this.exit(res);

            return this.pick();
        }
    }

    export function solve<Node extends HasheableNode>(path: Node[], color: Color, nkt: number, tt: TT,
        expand: Generator<Node>, status: Estimator<Node>, player?: Player): Result {
        const s = new Solver(path, color, nkt, tt, expand, status, player);
        let r, t: Result;
        while (t = s.next())
            r = t;
        return r;
    }
}
