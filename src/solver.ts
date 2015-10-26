/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="ann.ts" />
/// <reference path="ff256.ts" />

module tsumego {
    interface Node {
        hash: number;
        play(move: stone): number;
        undo(): stone;
    }

    export function solve(args: solve.Args): stone {
        const g = solve.start(args);

        let s = g.next();

        while (!s.done)
            s = g.next();

        return s.value;
    }

    export namespace solve {
        export interface Args {
            root: Node;
            color: number;
            nkt: number;
            tt: TT;
            expand: (node: Node, color: number) => stone[];
            status: (node: Node) => number;
            alive?: (node: Node) => boolean;
            htag?: (node: Node) => any;
            stats?: {
                nodes: number;
                depth: number;
            };
            player?: {
                play(move: stone): void;
                undo(): void;
                done(color: number, move: stone, comment?: string): void;
                loss(color: number): void;
            };
        }

        export function* start({root: board, color, nkt, tt, expand, status, player, alive, stats, htag}: Args) {
            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<[stone, number], { d: number, w: number; }>((a, b) =>
                b.d - a.d || // moves that require a ko treat are considered last
                b.w - a.w);  // first consider moves that lead to a winning position

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // tags[i] = hash of the path to the i-th position

            function* solve(color: number, nkt: number) {
                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const ttres = tt.get(hashb, color, nkt);

                stats && (stats.depth = depth, yield);

                if (ttres) {
                    player && (player.done(color, ttres, 'TT'), yield);
                    return ttres;
                }

                let result: stone;
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
                        w: stone.color(r) * color
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
                    let s: stone;

                    // this is a hash of the path: reordering moves must change the hash
                    const h = rcl(prevb != hashb ? prevb : 0, depth * 17 % 32) ^ hashb;

                    tags.push(h & ~15 | (nkt & 7) << 1 | (color < 0 ? 1 : 0));
                    path.push(hashb);
                    stats && stats.nodes++;
                    player && (player.play(move), yield);

                    if (!move) {
                        const i = tags.lastIndexOf(tags[depth], -2);

                        if (i >= 0) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = stone(null, null, status(board), i + 1);
                        } else {
                            // play a random move elsewhere and yield
                            // the turn to the opponent; playing a move
                            // elsewhere resets the local history of moves
                            s = yield* solve(-color, nkt);
                        }
                    } else {
                        board.play(move);

                        s = status(board) > 0 ? stone(null, null, +1, infty) :
                            // white has secured the group: black cannot
                            // capture it no matter how well it plays
                            alive && alive(board) ? stone(null, null, -1, infty) :
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
                    if (s * color < 0 && move)
                        mindepth = min(mindepth, d > depth ? stone.tag(s) : d);

                    // the winning move may depend on a repetition, while
                    // there can be another move that gives the same result
                    // uncondtiionally, so it might make sense to continue
                    // searching in such cases
                    if (s * color > 0) {
                        // if the board b was reached via path p has a winning
                        // move m that required to spend a ko treat and now b
                        // is reached via path q with at least one ko treat left,
                        // that ko treat can be spent to play m if it appears in q
                        // and then win the position again; this is why such moves
                        // are stored as unconditional (repd = infty)
                        result = stone(stone.x(move), stone.y(move), color, d > depth && move ? stone.tag(s) : d);
                        break;
                    }
                }

                // if there is no winning move, record a loss
                if (!result) {
                    result = stone(null, null, -color, mindepth);
                    player && (player.loss(color), yield);
                } else {
                    player && (player.done(color, result), yield);
                }

                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proved by trying to construct a path from a node in the
                // proof tree to the root node
                if (stone.tag(result) > depth + 1)
                    tt.set(hashb, result, nkt, htag && htag(board));

                return result;
            }

            const moves: stone[] = [];
            let move: stone;

            while (move = board.undo())
                moves.unshift(move);

            for (move of moves) {
                path.push(board.hash);
                board.play(move);
            }

            return yield* solve(color, nkt);
        }
    }
}
