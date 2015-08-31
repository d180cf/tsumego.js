/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />

module tsumego {
    'use strict';

    interface Estimator<Node> {
        (board: Node): number;
    }

    interface Spot<Node, Move> {
        node: Node;
        result: Result<Move>;
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

    export class _Solver<Node extends Hasheable, Move> {
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

    function best<Move>(s1: Result<Move>, s2: Result<Move>, c: Color) {
        let r1 = s1 && s1.color;
        let r2 = s2 && s2.color;

        if (!s1 && !s2)
            return;

        if (!s1)
            return r2 * c > 0 ? s2 : s1;

        if (!s2)
            return r1 * c > 0 ? s1 : s2;

        if (r1 * c > 0 && r2 * c > 0)
            return s1.repd > s2.repd ? s1 : s2;

        if (r1 * c < 0 && r2 * c < 0)
            return s1.repd < s2.repd ? s1 : s2;

        return (r1 - r2) * c > 0 ? s1 : s2;
    }

    const wins = (color: number, result: number) => color * result > 0;

    export function* Solver<Node extends Hasheable, Move>(
        path: Node[],
        color: Color,
        nkt: number,
        tt: TT<Move>,
        expand: Generator<Node, Move>,
        status: Estimator<Node>,
        player?: Player<Move>): IterableIterator<Spot<Node, Move>> {

        function* solve(
            path: Node[],
            color: Color,
            nkt: number,
            ko: boolean): IterableIterator<Spot<Node, Move>> {

            if (ko) {
                // since moves that require to spend a ko treat are considered
                // last, by this moment all previous moves have been searched
                // and resulted in a loss; hence the only option here is to spend
                // a ko treat and repeat the position
                nkt -= color;
                path = path.slice(-2);
            }

            const depth = path.length;
            const board = path[depth - 1];
            const ttres = tt.get(board, color, nkt);

            if (ttres)
                return ttres;

            let result: Result<Move>;
            let mindepth = infty;

            // TODO: better to use array comprehensions here
            const leafs = Array.from(function* () {
                for (const {b, m} of expand(board, color)) {
                    const d = findrepd(path, b);
                    const ko = d < depth;

                    if (d < mindepth)
                        mindepth = d;

                    // the move makes sense if it doesn't repeat
                    // a previous position or the current player
                    // has a ko treat elsewhere on the board and
                    // can use it to repeat the local position
                    if (!ko || color * nkt > 0) {
                        yield {
                            b: b,
                            m: m,
                            ko: ko,
                            nkt: ko ? nkt - color : nkt
                        };
                    }
                }
            } ());

            // moves that require a ko treat are considered last
            // that's not just perf optimization: the search depends on this
            leafs.sort((lhs, rhs) => (rhs.nkt - lhs.nkt) * color);

            for (const {b, m, ko} of leafs) {
                let s: Result<Move>;

                if (status(b) > 0) {
                    // black wins by capturing the white's stones
                    s = { color: +1, repd: infty };
                } else {
                    path.push(b);
                    const s_move = last(solve(path, -color, nkt, ko)).result; // the opponent makes a move

                    if (s_move && wins(s_move.color, -color)) {
                        s = s_move;
                    } else {
                        const s_pass = last(solve(path, color, nkt, ko)).result; // the opponent passes
                        const s_asis: Result<Move> = { color: status(b), repd: infty };

                        // the opponent can either make a move or pass if it thinks
                        // that making a move is a loss, while the current player
                        // can either pass again to count the result or make two
                        // moves in a row
                        s = best(s_move, best(s_asis, s_pass, color), -color);
                    }

                    path.pop();
                }

                // the min value of repd is counted only for the case
                // if all moves result in a loss; if this happens, then
                // the current player can say that the loss was caused
                // by the absence of ko treats and point to the earliest
                // repetition in the path
                if (s.repd < mindepth)
                    mindepth = s.repd;

                // the winning move may depend on a repetition, while
                // there can be another move that gives the same result
                // uncondtiionally, so it might make sense to continue
                // searching in such cases
                if (wins(s.color, color)) {
                    result = {
                        color: color,
                        repd: s.repd,
                        move: m
                    };

                    break;
                }
            }

            // if there is no winning move, record a loss
            if (!result)
                result = { color: -color, repd: mindepth };

            if (ko) {
                // the (dis)proof for the node may or may not intersect with
                // previous nodes in the path (the information about this is
                // not kept anywhere) and hence it has to be assumed that the
                // solution intersects with the path and thus cannot be reused
                result.repd = 0;
            }

            // if the solution doesn't depend on a ko above the current node,
            // it can be stored and later used unconditionally as it doesn't
            // depend on a path that leads to the node; this stands true if all
            // such solutions are stored and never removed from the table; this
            // can be proved by trying to construct a path from a node in the
            // proof tree to the root node
            if (result.repd > depth) {
                tt.set(board, color, {
                    color: result.color,
                    move: result.move,
                    repd: infty
                }, nkt);
            }

            yield { result: result, node: board };
        }

        yield* solve(path, color, nkt, false);
    }

    export function solve<Node extends Hasheable, Move>(
        path: Node[],
        color: Color,
        nkt: number,
        tt: TT<Move>,
        expand: Generator<Node, Move>,
        status: Estimator<Node>,
        player?: Player<Move>) {

        return last(Solver(path, color, nkt, tt, expand, status, player)).result;
    }
}
