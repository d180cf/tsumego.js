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
            if (!this.current)
                return;

            const node = this.path[this.depth - 1];
            const {color, nkt, move, res} = this.current;

            if (res) {
                this.exit();
                return;
            }

            const ttres = this.tt.get(node, color, nkt);

            if (ttres) {
                this.current.res = ttres;
                return;
            }

            if (this.status(node) > 0) {
                this.current.res = { color: +1, move: move, repd: infty };
                return;
            }

            const {leafs, mindepth} = this.expand(this.path, color, nkt);
            const t = this.current;

            t.next = leafs.map($ => ({
                node: $.b,
                move: $.m,
                nkt: $.ko ? nkt - color : nkt
            }));

            t.mindepth = mindepth;
            this.pick();
        }

        private pick(): void {
            const node = this.path[this.depth - 1];
            const {color, nkt, passed, move, next} = this.current;

            if (next.length > 0) {
                const {move, nkt, node} = next.splice(0, 1)[0];
                this.path.push(node);
                this.tags.push({ color: -color, nkt: nkt, move: move });

                if (this.player)
                    this.player.play(move.x, move.y, color);

                return;
            }

            if (!passed) {
                const prev = this.tags[this.depth - 2];

                if (prev && prev.passed) {
                    this.current.res = { color: this.status(node), repd: infty };
                    return;
                }

                this.current.passed = true;
                this.path.push(node);
                this.tags.push({ color: -color, node: node, nkt: nkt });

                if (this.player)
                    this.player.pass(color);

                return;
            }

            this.current.res = { color: -color, move: move, repd: infty };
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
                this.player.undo(move && move.x, move && move.y, res.color);
            }

            if (!this.current)
                return;

            if (this.current.color * res.color > 0) {
                this.current.res = res;
                return;
            }

            this.pick();
        }
    }
}
