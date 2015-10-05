/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="ann.ts" />

module tsumego {
    interface Node<Move> {
        hash: number;
        play(move: Move): number;
        undo(): Move;
    }

    function wins(color: number, result: number) {
        return color * result > 0;
    }

    function best<Move>(s1: Result<Move>, s2: Result<Move>, color: number) {
        const r1 = s1 && s1.color;
        const r2 = s2 && s2.color;

        if (!s1 && !s2)
            return;

        if (!s1)
            return r2 * color > 0 ? s2 : s1;

        if (!s2)
            return r1 * color > 0 ? s1 : s2;

        if (r1 * color > 0 && r2 * color > 0)
            return s1.repd > s2.repd ? s1 : s2;

        if (r1 * color < 0 && r2 * color < 0)
            return s1.repd < s2.repd ? s1 : s2;

        return (r1 - r2) * color > 0 ? s1 : s2;
    }

    interface Args<Move> {
        root: Node<Move>;
        color: number;
        nkt: number;
        tt: TT<Move>;
        expand: (node: Node<Move>, color: number) => Move[];
        status: (node: Node<Move>) => number;
        alive?: (node: Node<Move>) => boolean;
        stats?: {
            nodes: number;
            depth: number;
        };
        player?: {
            play(color: color, move: Move): void;
            undo(): void;
            done(color: color, move: Move, comment: string): void;
            loss(color: color, move: Move, response: Move): void;
        };
    }

    export function* _solve<Move>({root: board, color, nkt, tt, expand, status, player, alive, stats}: Args<Move>) {
        type R = Result<Move>;

        /** Moves that require a ko treat are considered last.
            That's not just perf optimization: the search depends on this. */
        const sa = new SortedArray<[Move, boolean], { ko: number, w: number }>((a, b) =>
            a.ko - b.ko ||  // moves that require a ko treat are considered last
            b.w - a.w);     // first consider moves that lead to a winning position  

        function* solve(path: number[], color: number, nkt: number, ko = false): IterableIterator<R> {
            if (ko) {
                // since moves that require to spend a ko treat are considered
                // last, by this moment all previous moves have been searched
                // and resulted in a loss; hence the only option here is to spend
                // a ko treat and repeat the position
                nkt -= color;
                path = path.slice(-2);
            }

            const depth = path.length;
            const hashb = path[depth - 1];
            const ttres = tt.get(hashb, color, nkt);

            if (stats) {
                stats.nodes++;
                stats.depth = depth;
                yield;
            }

            if (ttres) {
                player && (player.done(ttres.color, ttres.move, null), yield);
                return ttres;
            }

            let result: R;
            let mindepth = infty;

            const leafs = sa.reset();

            for (const move of expand(board, color)) {
                board.play(move);

                const d = path.lastIndexOf(board.hash, -2) + 1;
                const ko = d && d < depth;

                if (ko)
                    mindepth = d;

                // check if this node has already been solved
                const r = tt.get(board.hash, -color, nkt - (+ko) * color);

                // the move makes sense if it doesn't repeat
                // a previous position or the current player
                // has a ko treat elsewhere on the board and
                // can use it to repeat the local position
                if (!ko || color * nkt > 0)
                    sa.insert([move, ko], {
                        ko: +ko,
                        w: (r && r.color || 0) * color
                    });

                board.undo();
            }

            for (const [move, isko] of leafs) {
                board.play(move);

                let s: R;

                if (status(board) > 0) {
                    // black wins by capturing the white's stones
                    s = new Result<Move>(+1);
                } else if (alive && alive(board)) {
                    // white secures the group that black needed to capture
                    s = new Result<Move>(-1);
                } else {
                    path.push(board.hash);
                    player && (player.play(color, move), yield);

                    // the opponent makes a move
                    const s_move: R = yield* solve(path, -color, nkt, isko);

                    if (s_move && wins(s_move.color, -color)) {
                        s = s_move;
                    } else {
                        // the opponent passes
                        player && (player.play(-color, null), yield);
                        const s_pass: R = yield* solve(path, color, nkt, isko);
                        player && (player.undo(), yield);
                        const s_asis = new Result<Move>(status(board));

                        // the opponent can either make a move or pass if it thinks
                        // that making a move is a loss, while the current player
                        // can either pass again to count the result or make two
                        // moves in a row
                        s = best(s_move, best(s_asis, s_pass, color), -color);
                    }

                    path.pop();
                    player && (player.undo(), yield);
                }

                board.undo();

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
                    result = new Result<Move>(color, move, s.repd);
                    break;
                }
            }

            // if there is no winning move, record a loss
            if (!result) {
                result = new Result<Move>(-color, null, mindepth);
                player && (player.loss(color, null, null), yield);
            } else {
                player && (player.done(result.color, result.move, null), yield);
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
            if (result.repd > depth)
                tt.set(hashb, color, new Result<Move>(result.color, result.move), nkt);

            return result;
        }

        const moves: Move[] = [];
        const path: number[] = [];

        let move: Move;

        while (move = board.undo())
            moves.unshift(move);

        for (move of moves) {
            path.push(board.hash);
            board.play(move);
        }

        path.push(board.hash);

        const result = yield* solve(path, color, nkt);
        return result;
    }

    declare const process;

    export function solve<Move>(args: Args<Move>) {
        args = Object.create(args);

        const $ = args.stats = { nodes: 0, depth: 0 };
        const g = _solve(args);

        let maxd = 0;
        let t0 = Date.now();
        let t = t0, n = 0, ips = typeof process === 'object' ? 0 : Infinity;
        let s = g.next();

        while (!s.done) {
            s = g.next();
            n++;

            if ($.depth > maxd)
                maxd = $.depth;

            if (n > ips) {
                const t1 = Date.now();
                const dt = (t1 - t) / 1000;

                if (dt > 1) {
                    process.title = [
                        ['time', ((t1 - t0) / 1000).toFixed(1) + 's'],
                        ['tt.size', args.tt.size],
                        ['nodes', $.nodes],
                        ['nodes/s', n / dt | 0],
                        ['maxdepth', maxd],
                    ].map(x => x.join(' = ')).join('; ');

                    ips = n / dt | 0;
                    t = t1;
                    n = 0;
                }
            }
        }

        const r = s.value;

        if (r.repd == infty || !r.repd)
            delete r.repd;

        return r;
    }
}
