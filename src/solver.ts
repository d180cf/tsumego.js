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

    export function solve<Move>(args: solve.Args<Move>) {
        const g = solve.start(args);

        let s = g.next();

        while (!s.done)
            s = g.next();

        return s.value;
    }

    export namespace solve {
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

        export function* start<Move>({root: board, color, nkt, tt, expand, status, player, alive, stats}: Args<Move>) {
            type R = Result<Move>;

            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<[Move, boolean], { ko: number, w: number }>((a, b) =>
                a.ko - b.ko ||  // moves that require a ko treat are considered last
                b.w - a.w);     // first consider moves that lead to a winning position  

            function* solve(path: number[], color: number, nkt: number): IterableIterator<R> {
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

                for (const [move, ko] of leafs) {
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
                                    // spend a ko treat get the best opponent's answer
                                    ko ? yield* solve(path.slice(-1), -color, nkt - color) :
                                        // get the best opponent's answer
                                        yield* solve(path, -color, nkt);

                    !pass && board.undo();
                    path.pop();
                    player && (player.undo(), yield);

                    // the min value of repd is counted only for the case
                    // if all moves result in a loss; if this happens, then
                    // the current player can say that the loss was caused
                    // by the absence of ko treats and point to the earliest
                    // repetition in the path
                    if (!ko && s.repd < mindepth)
                        mindepth = s.repd;

                    // the winning move may depend on a repetition, while
                    // there can be another move that gives the same result
                    // uncondtiionally, so it might make sense to continue
                    // searching in such cases
                    if (s.color * color > 0) {
                        // the (dis)proof for the node may or may not intersect with
                        // previous nodes in the path (the information about this is
                        // not kept anywhere) and hence it has to be assumed that the
                        // solution intersects with the path and thus cannot be reused
                        result = new Result<Move>(color, move, ko ? 0 : s.repd);
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
