/// <reference path="stat.ts" />
/// <reference path="color.ts" />
/// <reference path="pattern.ts" />
/// <reference path="dumb.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="dcnn.ts" />
/// <reference path="gf2.ts" />

module tsumego.stat {
    export var ttinvalid = 0;
    logv.push(() => `wrong tt entires = ${ttinvalid}`);

    export var calls = 0;
    logv.push(() => `calls to solve = ${calls}`);

    export var expand = 0;
    logv.push(() => `calls to expand = ${expand} = ${expand / calls * 100 | 0} %`);

    export var first = 0;
    logv.push(() => `the 1-st move is correct = ${first / expand * 100 | 0} %`);
}

module tsumego {
    export interface DebugState {
        km?: number;
        path?: number[];
        moves?: stone[];
        color?: number;
        depth?: number;
    }

    export interface Args {
        board: Board;
        color: number;
        km?: number;
        tt: TT;
        expand(color: number): stone[];
        target: stone;
        alive?(node: Board): boolean;
        debug?: DebugState;
        time?: number;
        log?: {
            sgf?: boolean; // logs SGF for every solved node; 1.5x slower
            write(data): void;
        };
    }

    export function solve(args: Args) {
        const g = solve.start(args);

        let s = g.next();

        while (!s.done)
            s = g.next();

        return s.value;
    }

    export namespace solve {
        export function* start(args: Args) {
            const {board, color, km, tt, log, expand, debug, time} = args;

            let {target, alive} = args;

            if (log && alive) {
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

            if (!stone.hascoords(target))
                throw Error('The target stone is not set');

            // tells who is being captured: coords + color
            target = stone.make(stone.x(target), stone.y(target), sign(board.get(target)));

            if (!stone.color(target))
                throw Error('The target points to an empty point: ' + stone.toString(target));

            const sa = new SortedArray<stone>();
            const evalnode = evaluate(board, target);

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // this is to detect long loops, e.g. the 10,000 year ko
            const hist: stone[] = []; // the sequence of moves that leads to the current position

            function* solve(color: number, km: number) {
                remaining--;
                stat.calls++;

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
                const hash32 = board.hash;
                const hash_b = board.hash_b;
                const hash_w = board.hash_w;
                const ttres = tt.get(hash_b, hash_w, color, km);

                debug && (debug.color = color);
                debug && (debug.depth = depth);
                debug && (debug.moves = hist);
                debug && (debug.path = path);
                debug && (debug.km = km);

                if (ttres) {
                    // due to collisions, tt may give a result for a different position;
                    // however with 64 bit hashes, there expected to be just one collision
                    // per sqrt(2 * 2**64) = 6 billions positions = 12 billion w/b nodes
                    if (!board.get(ttres))
                        return repd.set(ttres, infdepth);

                    stat.ttinvalid++;
                }

                if (depth > infdepth / 2)
                    return repd.set(stone.nocoords(-color), 0);

                const guess = tt.move.get(color > 0 ? 1 : 0, hash32);

                let result: stone;
                let mindepth = infdepth;

                const nodes = sa.reset();

                stat.expand++;

                // 75% of the time the solver spends in this loop;
                // also, it's funny that in pretty much all cases
                // a for-of is slower than the plain for loop, but
                // in this case it's the opposite: for-of is way
                // faster for some mysterious reason; also v8 jit
                // doesn't optimize functions with yield, so it's
                // profitable to move out this chunk of code into
                // a plain function without yield/yield* stuff, but
                // this gives only a marginal profit
                for (const move of expand(color)) {
                    if (!board.play(move))
                        continue;

                    const value = -evalnode(-color);
                    const hash_b = board.hash_b;
                    const hash_w = board.hash_w;
                    const hash32 = board.hash;

                    board.undo();

                    // -1 indicates a sure loss
                    if (value <= -1)
                        continue;

                    // skip moves that are known to be losing
                    if (tt.get(hash_b, hash_w, -color, km) * color < 0)
                        continue;

                    let d = depth - 1;

                    while (d >= 0 && path[d] != hash32)
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

                    sa.insert(repd.set(move, d), [
                        // moves that require a ko treat are considered last
                        // that's not just perf optimization: the search depends on this
                        + 1e-0 * d

                        // tt guesses the correct winning move in 83% of cases
                        + 1e-1 * sign(guess * color)

                        // first consider moves that lead to a winning position
                        // use previously found solution as a hint
                        + 1e-2 * sign(tt.move.get(color < 0 ? 1 : 0, hash32) * color)

                        // now consider the evaluation of this position
                        + 1e-3 * value
                    ]);
                }

                // Consider making a pass as well. Passing locally is like
                // playing a move elsewhere and yielding the turn to the 
                // opponent locally: it doesn't affect the local position,
                // but resets the local history of moves. This is why passing
                // may be useful: a position may be unsolvable with the given
                // history of moves, but once it's reset, the position can be
                // solved despite the move is yilded to the opponent.
                // Also, there is no point to pass if the target is in atari.
                if (block.libs(board.get(target)) > 1)
                    nodes.push(0);

                let trials = 0;

                while (trials < nodes.length) {
                    const move = nodes[trials++];
                    const d = !move ? infdepth : repd.get(move);
                    let s: stone;

                    path.push(hash32);
                    hist.push(move || stone.nocoords(color));
                    move && board.play(move);
                    debug && (yield stone.toString(move || stone.nocoords(color)));


                    if (!move) {
                        const nextkm = prevb == hash32 && color * km < 0 ? 0 : km;
                        const tag = hash32 & ~15 | (-color & 3) << 2 | nextkm & 3; // tells which position, who plays and who is the km
                        const isloop = tags.lastIndexOf(tag) >= 0;

                        if (isloop) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = repd.set(stone.nocoords(target), depth - 1);
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
                            tags.push(tag);
                            s = yield* solve(-color, nextkm);
                            tags.pop();
                        }
                    } else {
                        if (!board.get(target))
                            s = repd.set(stone.nocoords(-target), infdepth);
                        else if (color * target > 0 && alive && alive(board))
                            s = repd.set(stone.nocoords(target), infdepth);
                        else
                            s = yield* solve(-color, km);
                    }

                    path.pop();
                    hist.pop();
                    move && board.undo();
                    debug && (yield stone.toString(repd.set(move, 0) || stone.nocoords(color)) + ' \u27f6 ' + stone.toString(s));

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

                        if (trials == 1 && nodes.length > 2)
                            stat.first++;

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
                    tt.set(hash_b, hash_w, color, result, km);

                tt.move.set(color > 0 ? 1 : 0, hash32, result);

                log && log.write({
                    color: color,
                    result: result,
                    target: target,
                    trials: trials,
                    guess: guess,
                    board: board.hash,
                    sgf: log.sgf && board.toStringSGF(),
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

            move = stone.km.set(move, km || 0);

            if (!Number.isFinite(km)) {
                // if it's a loss, see what happens if there are ko treats;
                // if it's a win, try to find a stronger move, when the opponent has ko treats
                const km2 = move * color > 0 ? -color : color;
                const move2 = yield* solve(color, km2);

                if (move2 * color > 0 && stone.hascoords(move2)) {
                    move = move2;
                    move = stone.km.set(move, km2);
                }
            }

            move = repd.set(move, 0);

            return typeof args === 'string' ?
                stone.toString(move) :
                move;
        }
    }
}
