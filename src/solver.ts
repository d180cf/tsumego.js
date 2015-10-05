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

    export interface Args<Move> {
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

    export function solve<Move>(args: Args<Move>) {
        const g = solve.start(args);

        let s = g.next();

        while (!s.done)
            s = g.next();

        return s.value;
    }

    export namespace solve {
        export function* start<Move>({root: board, color, nkt, tt, expand, status, player, alive, stats}: Args<Move>) {
            type R = Result<Move>;

            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<[Move, boolean], { ko: number, w: number }>((a, b) =>
                a.ko - b.ko ||  // moves that require a ko treat are considered last
                b.w - a.w);     // first consider moves that lead to a winning position  

            function* solve(path: number[], color: number, nkt: number, ko = false): IterableIterator<R> {
                if (ko) {                
                    // This flag is set if getting to this position required
                    // the caller to spend a ko treat elsewhere on the board.
                    // Let's say there was a position b1 and a move m1 that
                    // restored a previously played local position; in other
                    // words, b1 + m1 was found in the path. After a ko
                    // treat m0 was used, m1 could be played and the path became
                    // [..., b1 + m0, b1 + m0 + m1]. Positions before b1 + m0
                    // don't have the m0 stone on the board and hence it's not
                    // possible to repeat any of those positions. However it is
                    // possible to repeat b1 + m0. This is why only the last
                    // element from the path is taken and all others are dropped.
                    path = path.slice(-1);
                }

                const depth = path.length;
                const hashb = board.hash;
                const passed = board.hash == path[depth - 1];
                const ttres = tt.get(hashb, color, nkt);

                stats && (stats.depth = depth, yield);

                if (ttres) {
                    player && (player.done(ttres.color, ttres.move, null), yield);
                    return ttres;
                }

                let result: R;
                let mindepth = infty;

                const leafs = sa.reset();

                // consider all possible moves and then making a pass
                for (const move of [...expand(board, color), null]) {
                    const pass = move === null;

                    !pass && board.play(move),
                    stats && stats.nodes++;

                    const quit = passed && pass; // two passes is not a ko
                    const d = path.lastIndexOf(board.hash) + 1;
                    const ko = d && d <= depth && !quit;

                    if (ko && d < mindepth)
                        mindepth = d;

                    // the move makes sense if it doesn't repeat
                    // a previous position or the current player
                    // has a ko treat elsewhere on the board and
                    // can use it to repeat the local position
                    if (!ko || color * nkt > 0) {
                        // check if this node has already been solved
                        const r = tt.get(board.hash, -color, nkt - (+ko) * color);

                        sa.insert([move, ko], {
                            ko: +ko,
                            w: (r && r.color || 0) * color
                        });
                    }

                    !pass && board.undo();
                }

                for (const [move, isko] of leafs) {
                    const pass = move === null;
                    const quit = passed && pass;

                    path.push(board.hash);
                    !pass && board.play(move);
                    player && (player.play(color, move), yield);

                    const s: R =
                        // both players passed: check the target's status and quit
                        quit ? new Result<Move>(status(board)) :
                            // black has captured the target stone
                            status(board) > 0 ? new Result<Move>(+1) :
                                // white has secured the target stone
                                alive && alive(board) ? new Result<Move>(-1) :
                                    // get the best opponent's answer
                                    yield* solve(path, -color, nkt - color * +isko, isko);

                    !pass && board.undo();
                    path.pop();
                    player && (player.undo(), yield);

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
                if (result.repd > depth + 1)
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

            const result = yield* solve(path, color, nkt);
            return result;
        }
    }
}
