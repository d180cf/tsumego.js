/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="ann.ts" />
/// <reference path="ff256.ts" />

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
            htag?: (node: Node<Move>) => any;
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

        export function* start<Move>({root: board, color, nkt, tt, expand, status, player, alive, stats, htag}: Args<Move>) {
            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<[Move, number], { d: number, w: number; }>((a, b) =>
                b.d - a.d || // moves that require a ko treat are considered last
                b.w - a.w);  // first consider moves that lead to a winning position

            const path: number[] = [];
            const tags: number[] = [];

            function* solve(color: number, nkt: number): IterableIterator<Result<Move>> {
                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const ttres = tt.get(hashb, color, nkt);

                stats && (stats.depth = depth, yield);

                if (ttres) {
                    player && (player.done(ttres.color, ttres.move, 'TT'), yield);
                    return ttres;
                }

                let result: Result<Move>;
                let mindepth = infty;

                const nodes = sa.reset();

                for (const move of expand(board, color)) {
                    board.play(move);
                    const hash = board.hash;
                    board.undo();

                    let d = depth - 1;

                    while (d >= 0 && path[d] != hash)
                        d = d > 0 && path[d] == path[d - 1] ? -1 : d - 1;

                    d++;

                    if (!d) d = infty;

                    if (d < mindepth)
                        mindepth = d;

                    // there are no ko treats to play this move,
                    // so play a random move elsewhere and yield
                    // the turn to the opponent; this is needed
                    // if the opponent is playing useless ko-like
                    // moves that do not help even if all these
                    // ko fights are won
                    if (d <= depth && nkt * color <= 0)
                        continue;

                    // check if this node has already been solved
                    const r = tt.get(hash, -color, d <= depth ? nkt - color : nkt);

                    sa.insert([move, d], {
                        d: d,
                        w: (r && r.color || 0) * color
                    });
                }

                // Consider making a pass as well. Passing locally is like
                // playing a move elsewhere and yielding the turn to the 
                // opponent locally: it doesn't affect the local position,
                // but resets the local history of moves. This is why passing
                // may be useful: a position may be unsolvable with the given
                // history of moves, but once it's reset, the position can be
                // solved despite the move is yilded to the opponent.
                sa.insert([null, infty], { d: infty, w: 0 });

                for (const [move, d] of nodes) {
                    let s: Result<Move>;

                    const t = ff256.mul4(prevb != hashb ? prevb : 0, 0x03030303) ^ hashb;

                    tags.push(t & ~15 | (nkt & 7) << 1 | (color < 0 ? 1 : 0));
                    path.push(hashb);
                    stats && stats.nodes++;
                    player && (player.play(color, move), yield);

                    if (move === null) {
                        const i = tags.lastIndexOf(tags[depth], -2);

                        if (i >= 0) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = new Result<Move>(status(board), null, i + 1);
                        } else {
                            // play a random move elsewhere and yield
                            // the turn to the opponent; playing a move
                            // elsewhere resets the local history of moves
                            s = yield* solve(-color, nkt);
                        }
                    } else {
                        board.play(move);

                        s = status(board) > 0 ? new Result<Move>(+1) :
                            // white has secured the group: black cannot
                            // capture it no matter how well it plays
                            alive && alive(board) ? new Result<Move>(-1) :
                                // let the opponent play the best move
                                d > depth ? yield* solve(-color, nkt) :
                                    // this move repeat a previously played position:
                                    // spend a ko treat and yield the turn to the opponent
                                    yield* solve(-color, nkt - color);

                        board.undo();
                    }

                    path.pop();
                    tags.pop();
                    player && (player.undo(), yield);

                    // the min value of repd is counted only for the case
                    // if all moves result in a loss; if this happens, then
                    // the current player can say that the loss was caused
                    // by the absence of ko treats and point to the earliest
                    // repetition in the path
                    if (s.color * color < 0 && move)
                        mindepth = min(mindepth, d > depth ? s.repd : d);

                    // the winning move may depend on a repetition, while
                    // there can be another move that gives the same result
                    // uncondtiionally, so it might make sense to continue
                    // searching in such cases
                    if (s.color * color > 0) {
                        // if the board b was reached via path p has a winning
                        // move m that required to spend a ko treat and now b
                        // is reached via path q with at least one ko treat left,
                        // that ko treat can be spent to play m if it appears in q
                        // and then win the position again; this is why such moves
                        // are stored as unconditional (repd = infty)
                        result = new Result<Move>(color, move, d > depth && move ? s.repd : d);
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
                    tt.set(hashb, color, new Result<Move>(result.color, result.move), nkt, htag && htag(board));

                return result;
            }

            const moves: Move[] = [];
            let move: Move;

            while (move = board.undo())
                moves.unshift(move);

            for (move of moves) {
                path.push(board.hash);
                board.play(move);
            }

            const result = yield* solve(color, nkt);
            return result;
        }
    }
}
