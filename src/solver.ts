/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />

module tsumego {
    'use strict';

    interface Estimator<Node> {
        (board: Node): number;
    }

    export interface Player<Move> {
        play(color: Color, move: Move): void;
        undo(): void;
        done(color: Color, move: Move, comment: string): void;
        loss(color: Color, move: Move, response: Move): void;
    }

    /** Returns values in 1..path.length-1 range.
        If no repetition found, returns nothing.  */
    function findrepd<Node extends Hasheable>(path: Node[], b: Node) {
        for (let i = path.length - 1; i > 0; i--)
            if (b.hash() == path[i - 1].hash())
                return i;
    }

    export class Solver<Node extends Hasheable, Move> {
        private path: Node[] = [];

        private tags: {
            res?: Result<Move>;
            color: Color;
            nkt: number;
            move?: Move;
            passed?: boolean;
            next?: { node: Node, move: Move, nkt: number }[];
            mindepth?: number;
        }[] = [];

        get depth() {
            return this.path.length;
        }

        get current() {
            const i = this.depth - 1;
            return { tag: this.tags[i], node: this.path[i] };
        }

        constructor(path: Node[], color: Color, nkt: number,
            private tt: TT<Move>,
            private expand: Generator<Node, Move>,
            private status: Estimator<Node>,
            private player?: Player<Move>) {

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
            const {tag: t, node} = this.current;
            const {res, color, nkt} = t;

            if (res) {
                this.exit();
                return;
            }

            if (!t.next) {
                const leafs = this.expand(node, color);

                t.mindepth = infty;
                t.next = [];

                for (const {b, m} of leafs) {
                    const d = findrepd(this.path, b);
                    const ko = d < this.depth;

                    if (d < t.mindepth)
                        t.mindepth = d;

                    // the move makes sense if it doesn't repeat
                    // a previous position or the current player
                    // has a ko treat elsewhere on the board and
                    // can use it to repeat the local position
                    if (!ko || color * nkt > 0) {
                        t.next.push({
                            node: b,
                            move: m,
                            nkt: ko ? nkt - color : nkt
                        });
                    }
                }

                // moves that require a ko treat are considered last
                // that's not just perf optimization: the search depends on this
                t.next.sort((lhs, rhs) => (rhs.nkt - lhs.nkt) * color);

                // nodes will be .pop()'ed,
                // so reversing the list
                t.next.reverse();
            }

            this.pick();
        }

        private pick(): void {
            const {tag: {color, nkt, passed, move, next}, node} = this.current;

            if (next.length > 0) {
                const {move, nkt, node} = next.pop();
                this.play(node, move, color, nkt);
            } else if (passed) {
                this.done({ color: -color, move: move }, Color.alias(color) + ' is out of moves');
            } else {
                const prev = this.tags[this.depth - 2];

                if (prev && prev.passed) {
                    this.done({ color: this.status(node) }, 'both passed');
                } else {
                    this.current.tag.passed = true;
                    this.play(node, null, color, nkt);
                }
            }
        }

        private play(node: Node, move: Move, color: Color, nkt: number): void {
            const ttres = this.tt.get(node, -color, nkt);

            if (ttres) {
                if (ttres.color * color > 0)
                    this.done(ttres, 'cached result');
                else if (this.player)
                    this.player.loss(color, move, ttres.move);
            } else if (this.status(node) > 0) {
                this.done({ color: +1, move: move });
            } else {
                this.path.push(node);
                this.tags.push({ color: -color, nkt: nkt, move: move });

                if (this.player)
                    this.player.play(color, move);
            }
        }

        private done(r: Result<Move>, comment?: string) {
            this.current.tag.res = r;

            if (this.player)
                this.player.done(r.color, r.move, comment);
        }

        private exit(): void {
            const {tag: {color, nkt, mindepth, res}, node} = this.current;

            if (color * res.color < 0)
                res.repd = mindepth;

            if (!res.repd || res.repd > this.depth)
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

            if (this.current.tag.color * res.color > 0) {
                this.done(res);
                return;
            }

            this.pick();
        }
    }

    export function solve<Node extends Hasheable, Move>(
        path: Node[],
        color: Color,
        nkt: number,
        tt: TT<Move>,
        expand: Generator<Node, Move>,
        status: Estimator<Node>,
        player?: Player<Move>) {

        const solver = new Solver(path, color, nkt, tt, expand, status, player);
        const current = solver.current.tag;

        while (!current.res)
            solver.next();

        if (current.res) {
            const r = current.res;

            if (!r.repd || r.repd == infty)
                delete current.res.repd;

            if (!r.move)
                delete r.move;
        }

        return current.res;
    }
}
