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
            /** whether the player has passed already */
            passed?: boolean;
            /** possible continuations */
            next?: { node: Node, move: Coords, nkt: number }[];
            /** the earliest node repeated by the continuations */
            mindepth?: number;
        }[] = [];

        private get depth() {
            return this.path.length;
        }

        private get current() {
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

        next(): Result {
            if (!this.current)
                return null;

            const node = this.path[this.depth - 1];
            const {color, nkt, move} = this.current;
            const ttres = this.tt.get(node, color, nkt);

            if (ttres)
                return this.exit(ttres);

            if (this.status(node) > 0)
                return this.exit({ color: +1, move: move, repd: infty });

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
            const node = this.path[this.depth - 1];
            const {color, nkt, passed, move, next} = this.current;

            if (next.length > 0) {
                const {move, nkt, node} = next.splice(0, 1)[0];
                this.path.push(node);
                this.tags.push({ color: -color, nkt: nkt, move: move });

                if (this.player)
                    this.player.play(move.x, move.y, color);

                return { color: 0, repd: 0 };
            }

            if (!passed) {
                const prev = this.tags[this.depth - 2];

                if (prev && prev.passed)
                    return this.exit({ color: this.status(node), repd: infty });

                this.current.passed = true;
                this.path.push(node);
                this.tags.push({ color: -color, node: node, nkt: nkt });

                if (this.player)
                    this.player.pass(color);

                return { color: 0, repd: 0 };
            }

            return this.exit({ color: -color, move: move, repd: infty });
        }

        private exit(res: Result): Result {
            const node = this.path[this.depth - 1];
            const {color, nkt, mindepth} = this.current;

            if (color * res.color < 0)
                res.repd = mindepth;

            if (res.repd > this.depth)
                this.tt.set(node, color, res, nkt);

            this.path.pop();
            this.tags.pop();

            if (this.player)
                this.player.undo(res.move && res.move.x, res.move && res.move.y, res.color);

            if (!this.current)
                return res;

            if (this.current.color * res.color > 0)
                return this.exit(res);

            return this.pick();
        }
    }
}
