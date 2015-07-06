/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />

module tsumego {
    interface Estimator {
        (board: Board): number;
    }

    function best(s1: Result, s2: Result, c: Color): Result {
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

    export function solve(
        path: Board[],
        color: Color,
        nkotreats: number,
        rzone: XYIndex[],
        tt: Cache,
        expand: Generator,
        status: Estimator)

        : Result {

        function __solve(path: Board[], color: Color, nkotreats: number): Result {
            function tthash(b: Board, c: Color): string {
                return c2s(c) + ':' + b.hash();
            }

            function ttlookup(b: Board, c: Color, n: number): Result {
                const h = tthash(b, c);
                const s = tt[h];

                if (s) {
                    if (n >= s.bmax)
                        return { color: +1, move: s.move, repd: infty };

                    if (n <= s.wmin)
                        return { color: -1, move: s.move, repd: infty };
                }
            }

            function ttstore(b: Board, c: Color, n: number, r: Result) {
                const h = tthash(b, c);
                const s = tt[h] || { wmin: -infty, bmax: +infty, move: r.move };

                if (r.color > 0 && n < s.bmax)
                    s.bmax = n, s.move = r.move;

                if (r.color < 0 && n > s.wmin)
                    s.wmin = n, s.move = r.move;

                tt[h] = s;
            }

            function _solve(color: Color): Result {
                const depth = path.length;
                const board = path[depth - 1];

                let result = ttlookup(board, color, nkotreats);

                if (!result) {
                    let {leafs, mindepth} = expand(path, rzone, color, nkotreats);

                    for (let {b: b, m: m, ko: ko} of leafs) {
                        let s: Result;

                        if (status(b) > 0) {
                            // black wins by capturing the white's stones
                            s = { color: +1, repd: infty };
                        } else if (!ko) {
                            path.push(b);
                            let s_move = _solve(-color); // the opponent makes a move

                            if (s_move && isWin(s_move.color, -color)) {
                                s = s_move;
                            } else {
                                let s_pass = _solve(color); // the opponent passes
                                let s_asis: Result = { color: status(b), repd: infty };

                                // the opponent can either make a move or pass if it thinks
                                // that making a move is a loss, while the current player
                                // can either pass again to count the result or make two
                                // moves in a row
                                s = best(s_move, best(s_asis, s_pass, color), -color);
                            }

                            path.pop();
                        } else {
                            // since moves that require to spend a ko treat are considered
                            // last, by this moment all previous moves have been searched
                            // and resulted in a loss; hence the only option here is to spend
                            // a ko treat and repeat the position
                            let s_move = __solve([board, b], -color, nkotreats - color);

                            if (s_move && isWin(s_move.color, -color)) {
                                s = s_move;
                            } else {
                                let s_pass = __solve([board, b], color, nkotreats - color);
                                let s_asis: Result = { color: status(b), repd: infty };

                                s = best(s_move, best(s_asis, s_pass, color), -color);
                            }

                            // the (dis)proof for the node may or may not intersect with
                            // previous nodes in the path (the information about this is
                            // not kept anywhere) and hence it has to be assumed that the
                            // solution intersects with the path and thus cannot be reused
                            s.repd = 0;
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
                        if (isWin(s.color, color)) {
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

                    // if the solution doesn't depend on a ko above the current node,
                    // it can be stored and later used unconditionally as it doesn't
                    // depend on a path that leads to the node; this stands true if all
                    // such solutions are stoed and never removed from the table; this
                    // can be proved by trying to construct a path from a node in the
                    // proof tree to the root node
                    if (result.repd > depth) {
                        ttstore(board, color, nkotreats, {
                            color: result.color,
                            move: result.move,
                            repd: infty
                        });
                    }
                }

                return result;
            }

            return _solve(color);
        }

        return __solve(path, color, nkotreats);
    }
}
