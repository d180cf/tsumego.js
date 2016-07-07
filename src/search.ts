/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="dcnn.ts" />
/// <reference path="gf2.ts" />

module tsumego {
    const infdepth = 255;

    module repd {
        export const get = move => move >> 8 & 255;
        export const set = (move, repd) => move & ~0xFF00 | repd << 8;
    }

    interface Node {
        hash: number;
        play(move: stone): number;
        undo(): stone;
    }

    /**
     * The problem's description is given as an SGF string:
     *
     *      (;FF[4]SZ[9]
     *        AB[aa][bb][cd][ef]
     *        AW[ab][df]
     *        MA[ab]
     *        PL[W])
     * 
     * There are a few tags in the SGF that must be present:
     *
     *      SZ  The board size, up to 16 x 16.
     *      AB  The set of black stones.
     *      AW  The set of white stones.
     *      MA  The target that needs to be captured or secured.
     *      PL  Who plays first.
     *
     * Returns the best move if there is such a move:
     *
     *      W[cb]   White wins by playing at C8.
     *      W       White passes and still wins (i.e. when there is a seki).
     *      B       White doesn't have a winning move in the R-zone.
     */
    export function solve(sgf: string): string;
    export function solve(args: solve.Args): stone;

    export function solve(args) {
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
            km?: number;
            tt?: TT;
            expand(color: number): stone[];
            status(node: Node): number;
            alive?(node: Node): boolean;
            debug?: boolean;
            time?: number;
            log?: {
                write(data): void;
            };
            unodes?: {
                total: number;
                unique: number;
            };
            stats?: {
                nodes: number;
                depth: number;
            };
        }

        function parse(data: string): Args {
            const sgf = SGF.parse(data);
            if (!sgf) throw SyntaxError('Invalid SGF.');

            const errors = [];

            const exec = <T>(fn: () => T, em?: string) => {
                try {
                    return fn();
                } catch (e) {
                    errors.push(em || e && e.message);
                }
            };

            const board = exec(
                () => new Board(sgf));

            const color = exec(
                () => sgf.get('PL')[0] == 'W' ? -1 : +1,
                'PL[W] or PL[B] must tell who plays first.');

            const target = exec(
                () => stone.fromString(sgf.get('MA')[0]),
                'MA[xy] must specify the target white stone.');

            if (errors.length)
                throw SyntaxError('The SGF does not correctly describe a tsumego:\n\t' + errors.join('\n\t'));

            const tb = board.get(target);

            return {
                root: board,
                color: color,
                expand: mgen.fixed(board, target),
                status: (b: Board) => b.get(target) ? tb : -tb,
                alive: (b: Board) => tsumego.benson.alive(b, target)
            };
        }

        export function* start(args: Args | string) {
            let {root: board, color, km, tt = new TT, log, expand, status, alive, stats, unodes, debug, time} =
                typeof args === 'string' ? parse(args) : args;

            if (log) {
                const test = alive;

                alive = node => {
                    const res = test(node);

                    log && log.write({
                        board: node.hash,
                        benson: res
                    });

                    return res;
                };
            }

            // cache results from static analysis as it's quite slow
            alive = memoized(alive, board => board.hash);

            let started = Date.now(), yieldin = 100, remaining = yieldin;

            // tells who is being captured
            const target = status(board);

            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<stone, { d: number, w: number }>((a, b) =>
                b.d - a.d || // moves that require a ko treat are considered last
                b.w - a.w);  // first consider moves that lead to a winning position

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // tags[i] = hash of the path to the i-th position

            function* solve(color: number, km: number) {
                remaining--;

                if (time && !remaining) {
                    yield;
                    const current = Date.now();
                    const speed = yieldin / (current - started);
                    started = current;
                    yieldin = max(speed * time | 0, 1);
                    remaining = yieldin
                }

                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const ttres = tt.get(hashb, color, km);

                stats && (stats.depth = depth, yield);

                if (ttres) {
                    debug && (yield 'reusing cached solution: ' + stone.toString(ttres));
                    return repd.set(ttres, infdepth);
                }

                if (unodes) {
                    unodes.total++;

                    if (!unodes[hashb]) {
                        unodes[hashb] = true;
                        unodes.unique++;
                    }
                }

                const guess = tt.move[hashb ^ color] || 0;

                let result: stone;
                let mindepth = infdepth;

                const nodes = sa.reset();

                for (const move of expand(color)) {
                    board.play(move);
                    const hash = board.hash;
                    board.undo();

                    let d = depth - 1;

                    while (d >= 0 && path[d] != hash)
                        d = d > 0 && path[d] == path[d - 1] ? -1 : d - 1;

                    d++;

                    if (!d) d = infdepth;

                    if (d < mindepth)
                        mindepth = d;

                    // there are no ko treats to play this move,
                    // so play a random move elsewhere and yield
                    // the turn to the opponent; this is needed
                    // if the opponent is playing useless ko-like
                    // moves that do not help even if all these
                    // ko fights are won
                    if (d <= depth && km * color <= 0)
                        continue;

                    sa.insert(repd.set(move, d), {
                        d: d,
                        // use previously found solution as a hint
                        w: stone.color(tt.move[hash ^ -color] || 0) * color
                    });
                }

                // Consider making a pass as well. Passing locally is like
                // playing a move elsewhere and yielding the turn to the 
                // opponent locally: it doesn't affect the local position,
                // but resets the local history of moves. This is why passing
                // may be useful: a position may be unsolvable with the given
                // history of moves, but once it's reset, the position can be
                // solved despite the move is yilded to the opponent.
                sa.insert(0, {
                    d: infdepth,
                    w: 0
                });

                let trials = 0;

                for (const move of nodes) {
                    trials++;
                    const d = !move ? infdepth : repd.get(move);
                    let s: stone;

                    // this is a hash of the path: reordering moves must change the hash;
                    // 0x87654321 is meant to be a generator of the field, but I didn't
                    // know how to find such a generator, so I just checked that first
                    // million powers of this element are unique
                    const h = gf32.mul(prevb != hashb ? prevb : 0, 0x87654321) ^ hashb;

                    tags.push(h & ~15 | (km & 7) << 1 | (color < 0 ? 1 : 0));
                    path.push(hashb);
                    stats && stats.nodes++;

                    if (!move) {
                        debug && (yield 'yielding the turn to the opponent');
                        const i = tags.lastIndexOf(tags[depth], -2);

                        if (i >= 0) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = repd.set(stone.nocoords(status(board)), i + 1);
                        } else {
                            // play a random move elsewhere and yield
                            // the turn to the opponent; playing a move
                            // elsewhere resets the local history of moves;
                            //
                            // There is a tricky side effect related to ko.
                            // Consider two positions below:
                            //
                            //  ============|      =============  
                            //  X O - O O O |      X O - X X X |
                            //  X X O O - O |      X O O O O - |
                            //  - X X O O O |      X X X X O O |
                            //  - - X X X X |            X X X |
                            //
                            // In both cases if O has infinitely many ko treats
                            // (this is the case when there is a large double ko
                            // elsewhere on the board), then O lives. However if
                            // O has finitely many ko treats, X can first remove
                            // them all (locally, removing an external ko treat
                            // means passing), recapture the stone and since O
                            // doesn't have ko treats anymore, it dies.
                            //
                            // Modeling this is simple. If X passes and then O passes,
                            // X can assume that it can repeat this as many times as
                            // needed to remove all ko treats and then yield the turn
                            // to O now in assumption that O has no ko treats. This is
                            // what the (prevb == hashb) check below does: it checks
                            // that if the two last moves were passes, the ko treats
                            // can be voided and the search can be resumed without them.
                            s = yield* solve(-color, prevb == hashb ? 0 : km);
                        }
                    } else {
                        board.play(move);
                        debug && (yield);

                        s = status(board) * target < 0 ? repd.set(stone.nocoords(-target), infdepth) :
                            // white has secured the group: black cannot
                            // capture it no matter how well it plays
                            color * target > 0 && alive && alive(board) ? repd.set(stone.nocoords(target), infdepth) :
                                // let the opponent play the best move
                                yield* solve(-color, move && km);

                        board.undo();
                    }

                    debug && (yield 'the outcome of this move: ' + stone.toString(s));
                    path.pop();
                    tags.pop();

                    // the min value of repd is counted only for the case
                    // if all moves result in a loss; if this happens, then
                    // the current player can say that the loss was caused
                    // by the absence of ko treats and point to the earliest
                    // repetition in the path
                    if (s * color < 0 && move)
                        mindepth = min(mindepth, d > depth ? repd.get(s) : d);

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
                        result = repd.set(
                            move || stone.nocoords(color),
                            d > depth && move ?
                                repd.get(s) :
                                d);
                        break;
                    }
                }

                // if there is no winning move, record a loss
                if (!result)
                    result = repd.set(stone.nocoords(-color), mindepth);

                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proved by trying to construct a path from a node in the
                // proof tree to the root node
                if (repd.get(result) > depth + 1)
                    tt.set(hashb, color, result, km);

                if (guess) {
                    log && log.write({
                        board: hashb,
                        color: color,
                        guess: guess,
                        result: result
                    });
                }

                tt.move[hashb ^ color] = result;

                log && log.write({
                    result: color * stone.color(result),
                    trials: trials
                });

                return result;
            }

            // restore the path from the history of moves
            {
                const moves: stone[] = [];
                let move: stone;

                while (move = board.undo())
                    moves.unshift(move);

                for (move of moves) {
                    path.push(board.hash);
                    board.play(move);
                }
            }

            let move = yield* solve(color, km || 0);

            if (!Number.isFinite(km)) {
                // if it's a loss, see what happens if there are ko treats;
                // if it's a win, try to find a stronger move, when the opponent has ko treats
                const move2 = yield* solve(color, move * color > 0 ? -color : color);

                if (move2 * color > 0)
                    move = move2;
            }

            return typeof args === 'string' ?
                stone.toString(move) :
                move;
        }
    }
}
