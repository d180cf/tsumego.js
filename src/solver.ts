/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="ann.ts" />

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

    Array.from = Array.from || function (iterable) {
        const array = [];
        for (const item of iterable)
            array.push(item);
        return array;
    };

    export function* _solve<Node extends Hasheable, Move>(
        path: Node[],
        color: Color,
        nkt: number,
        tt: TT<Move>,
        expand: Generator<Node, Move>,
        status: Estimator<Node>,
        player?: Player<Move>) {

        type R = Result<Move>;

        function* solve(
            path: Node[],
            color: Color,
            nkt: number,
            ko: boolean): IterableIterator<R> {

            yield; // entering the node

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

            if (ttres) {
                player && player.done(ttres.color, ttres.move, null);
                return ttres;
            }

            let result: R;
            let mindepth = infty;

            const leafs = [...function* () {
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
            } ()];

            // moves that require a ko treat are considered last
            // that's not just perf optimization: the search depends on this
            leafs.sort((lhs, rhs) => (rhs.nkt - lhs.nkt) * color);

            for (const {b, m, ko} of leafs) {
                let s: R;

                if (status(b) > 0) {
                    // black wins by capturing the white's stones
                    s = { color: +1, repd: infty };
                } else {
                    path.push(b);
                    player && player.play(color, m);

                    // the opponent makes a move
                    const s_move: R = yield* solve(path, -color, nkt, ko);

                    if (s_move && wins(s_move.color, -color)) {
                        s = s_move;
                    } else {
                        // the opponent passes
                        player && player.play(-color, null);
                        const s_pass: R = yield* solve(path, color, nkt, ko);
                        player && player.undo();
                        const s_asis: R = { color: status(b), repd: infty };

                        // the opponent can either make a move or pass if it thinks
                        // that making a move is a loss, while the current player
                        // can either pass again to count the result or make two
                        // moves in a row
                        s = best(s_move, best(s_asis, s_pass, color), -color);
                    }

                    path.pop();
                    player && player.undo();
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
            if (!result) {
                result = { color: -color, repd: mindepth };
                player && player.loss(color, null, null);
            } else {
                player && player.done(result.color, result.move, null);
            }

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

            return result;
        }

        return yield* solve(path, color, nkt, false);
    }

    export function solve<Node extends Hasheable, Move>(
        path: Node[],
        color: Color,
        nkt: number,
        tt: TT<Move>,
        expand: Generator<Node, Move>,
        status: Estimator<Node>,
        player?: Player<Move>) {

        const r = result(_solve(path, color, nkt, tt, expand, status, player));
        if (r.repd == infty || !r.repd)
            delete r.repd;
        return r;
    }
}
