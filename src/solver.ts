/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />

module tsumego {
    interface Estimator<Node> {
        (board: Node): number;
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

    export function solve<Node extends HasheableNode>(path: Node[], color: Color, nkt: number, tt: TT,
        expand: Generator<Node>, status: Estimator<Node>): Result {

        function _solve(path: Node[], color: Color, nkt: number, ko: boolean): Result {
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

            let result: Result;
            let {leafs, mindepth} = expand(path, color, nkt);

            for (const {b, m, ko} of leafs) {
                let s: Result;

                if (status(b) > 0) {
                    // black wins by capturing the white's stones
                    s = { color: +1, repd: infty };
                } else {
                    path.push(b);
                    const s_move = _solve(path, -color, nkt, ko); // the opponent makes a move

                    if (s_move && isWin(s_move.color, -color)) {
                        s = s_move;
                    } else {
                        const s_pass = _solve(path, color, nkt, ko); // the opponent passes
                        const s_asis: Result = { color: status(b), repd: infty };

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
            // such solutions are stoed and never removed from the table; this
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

        return _solve(path, color, nkt, false);
    }
}
