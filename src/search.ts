/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="dcnn.ts" />
/// <reference path="gf2.ts" />

module tsumego {
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

    /**
     * The idea of the solver is iterative deepening by
     * the number of liberties of the target block. For
     * instance, if the target has 3 libs initially, it
     * first tries to find a solution in which after each
     * move of the attacker, the target has at most 2 libs.
     * Then, if this doesn't work, it lets the target have
     * at most 3 libs and so on. This max number of libs
     * is also known as the lambda order.
     *
     * In the T. Thomsen's paper a search of lambda order N
     * covers an area that serves as the relevancy zone for
     * the next search of order N + 1. Here the relevancy
     * zone is always the same: the entire area inside the fully
     * enclosed region. The attacker only takes into account
     * that in some cases it must play on a liberty of the target.
     *
     * This is pretty much a simplified version of the lambda search.
     *
     * Thomas Thomsen. "Lambda-search in game trees - with application to Go"
     * www.t-t.dk/publications/lambda_lncs.pdf
     */
    export function solve(args) {
        const g = solve.start(args);

        let s = g.next();

        while (!s.done)
            s = g.next();

        return s.value;
    }

    export namespace solve {
        export interface DebugState {
            km?: number;
            path?: number[];
            moves?: stone[];
            color?: number;
            level?: number;
            depth?: number;
        }

        export interface Args {
            board: Board;
            color: number;
            km?: number;
            tt?: TT;
            expand(color: number): stone[];
            target: stone;
            alive?(node: Board): boolean;
            debug?: DebugState;
            time?: number;
            log?: {
                write(data): void;
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
                board: board,
                color: color,
                expand: mgen.fixed(board, target),
                target: target,
                alive: (b: Board) => tsumego.benson.alive(b, target)
            };
        }

        export function* start(args: Args | string) {
            let {board, color, km, tt = new TT, log, expand, target, alive, debug, time} =
                typeof args === 'string' ? parse(args) : args;

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

            let started = Date.now(), yieldin = 100, remaining = yieldin, ntcalls = 0;

            // tells who is being captured: coords + color
            target = stone(stone.x(target), stone.y(target), sign(board.get(target)));

            if (!stone.color(target))
                throw Error('The target points to an empty point: ' + stone.toString(target));

            const sa = new SortedArray<stone>();

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // this is to detect long loops, e.g. the 10,000 year ko
            const hist: stone[] = []; // the sequence of moves that leads to the current position

            // the max level (aka the lambda order) is the max number of libs
            // that the target can have after the attacker plays a move; if
            // the target gets to make two extra libs (maxlevel + 2), then
            // the target escapes because after the next attacker's move
            // the target will have at least maxlevel + 1 libs
            function* solve(color: number, km: number, maxlevel: number) {
                remaining--;
                ntcalls++;

                if (time && !remaining) {
                    yield ntcalls;
                    const current = Date.now();
                    const speed = yieldin / (current - started);
                    started = current;
                    yieldin = max(speed * time | 0, 1);
                    remaining = yieldin
                }

                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const nlibs = block.libs(board.get(target));
                const ttres = tt.get(hashb, color, km, maxlevel);

                debug && (debug.level = maxlevel);
                debug && (debug.color = color);
                debug && (debug.depth = depth);
                debug && (debug.moves = hist);
                debug && (debug.path = path);
                debug && (debug.km = km);

                // due to collisions, tt may give a result for a different position
                if (ttres && !board.get(ttres)) {
                    //debug && (yield 'reusing cached solution: ' + stone.toString(ttres));
                    return repd.set(ttres, infdepth);
                }

                if (depth > infdepth / 2)
                    return repd.set(stone.nocoords(-color), 0);

                const guess = tt.move.get(hashb ^ color);

                let result: stone;
                let mindepth = infdepth;
                let minlevel = inflevel;

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

                    sa.insert(repd.set(move, d), [
                        // moves that require a ko treat are considered last
                        // that's not just perf optimization: the search depends on this
                        d,
                        // first consider moves that lead to a winning position
                        // use previously found solution as a hint
                        stone.color(tt.move.get(hash ^ -color)) * color
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

                for (const move of nodes) {
                    trials++;
                    const d = !move ? infdepth : repd.get(move);
                    let s: stone;

                    path.push(hashb);
                    hist.push(move || stone.nocoords(color));
                    move && board.play(move);
                    debug && (yield move ? stone.toString(move) : stone.label.string(color) + '[]');

                    if (!move) {
                        const nextkm = prevb == hashb && color * km < 0 ? 0 : km;
                        const tag = hashb & ~15 | (-color & 3) << 2 | nextkm & 3; // tells which position, who plays and who is the km
                        const isloop = tags.lastIndexOf(tag) >= 0;

                        if (isloop) {
                            // the opponent already had a chance to play in the same exact situation,
                            // so it's a loop and the target isn't going to be captured; in this case:
                            //
                            //  |============
                            //  | X X X - O X
                            //  | - X O O O X
                            //  | O O O X X X
                            //  | X X X X
                            //
                            // O has a one-eye shape, however it cannot be solved within level = 2, so
                            // if O was to move first, O passes, then X passes (level = 2 is too strict),
                            // O passes again and the result shouldn't have the inf level just because O
                            // doesn't have other moves; the returned level should be 2 in this case because
                            // O can be captured within level = 3
                            //
                            // yet another tricky situation is a "dynamic seki" when there are no ko treats:
                            //
                            //  =============
                            //  | W B B - W B
                            //  | - W - W W B
                            //  | W W W W B B
                            //  | B B B B B
                            //
                            // if black captures the white stone, the only followup would be to connect
                            // and make a seki; if white plays first, it cannot connect, but it cannot
                            // approach black either because then black will capture the stone and white
                            // doesn't have ko treats to recapture it back
                            //
                            // the trouble with such shape is that white is first proven to be safe within level 3,
                            // then within level 4, then within level 5 and so on, until it reaches the max level
                            s = rlvl.set(repd.set(stone.nocoords(target), depth - 1), inflevel /* target * color < 0 ? minlevel : maxlevel */);
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
                            s = yield* solve(-color, nextkm, maxlevel);
                            tags.pop();
                        }
                    } else {
                        // if it's now the attacker's turn, then it can reduce the number of
                        // libs by one at most, so the min level will be the number of libs
                        // minus one; if it's now the defender's turn, then the min level
                        // is the number of libs by definition of the max level
                        const minlevel = block.libs(board.get(target)) - (target * color > 0 ? 1 : 0);

                        if (!board.get(target)) {
                            s = rlvl.set(repd.set(stone.nocoords(-target), infdepth), inflevel); // the target is captured
                        } else if (color * target > 0 && alive && alive(board)) {
                            s = rlvl.set(repd.set(stone.nocoords(target), infdepth), inflevel); // the target is sure alive now
                        } else if (maxlevel && minlevel > maxlevel) {
                            s = rlvl.set(repd.set(stone.nocoords(target), infdepth), minlevel - 1);
                        } else if (maxlevel && color * target > 0 && minlevel < maxlevel && minlevel < 3) {
                            // if it's now the attacker's turn and the target has
                            // too few liberties, try to split the search into a
                            // few sub searches: first try to keep the target from
                            // getting more libs, then increment the max level and
                            // so on until a solutiuon is found
                            for (const level of [minlevel, maxlevel]) {
                                //debug && (yield 'starting sub search with level = ' + level);
                                s = yield* solve(-color, km, level);
                                //debug && (yield 'sub search with level = ' + level + ' ended with ' + stone.toString(s));

                                // reducing the max level is only good for the defender
                                // because in addition to making life it can also escape,
                                // hence if the defender loses with a lower max level, it
                                // will surely lose with all higher max levels
                                if (s * target < 0 || rlvl.get(s) >= maxlevel)
                                    break;
                            }
                        } else {
                            s = yield* solve(-color, km, maxlevel); // let the opponent play the best move
                        }
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

                    // If all moves result in a loss, the attacker must pick
                    // the one with the lowest maxlevel. For instance, if it
                    // has two moves:
                    //
                    //  move #1 - the target extends and gets 3 libs
                    //  move #2 - the target connects and gets 7 libs
                    //
                    // it loses if maxlevel=2, but maybe wins if maxlevel=3.
                    // However if all moves of the defender result in a loss,
                    // it's an unconditional loss: e.g. if the target cannot
                    // escape a ladder (maxlevel=1), it will not escape a
                    // higher level attack.
                    if (s * color < 0 && color * target < 0)
                        minlevel = min(minlevel, rlvl.get(s));

                    // the winning move may depend on a repetition, while
                    // there can be another move that gives the same result
                    // uncondtiionally, so it might make sense to continue
                    // searching in such cases
                    if (s * color > 0) {
                        result = move || stone.nocoords(color);
                        result = rlvl.set(result, rlvl.get(s));
                        // if the board b was reached via path p has a winning
                        // move m that required to spend a ko treat and now b
                        // is reached via path q with at least one ko treat left,
                        // that ko treat can be spent to play m if it appears in q
                        // and then win the position again; this is why such moves
                        // are stored as unconditional (repd = infty)
                        result = repd.set(result, d > depth && move ? repd.get(s) : d);
                        break;
                    }
                }

                // if there is no winning move, record a loss
                if (!result)
                    result = rlvl.set(repd.set(stone.nocoords(-color), mindepth), minlevel);

                // the level field in the solution tells when it's applicable:
                // only if max level is not greater than this field; so it would
                // be strange to ask for a solution for maxlevel = 5 and get
                // an answer that applies only to maxlevel = 1..4
                if (rlvl.get(result) < maxlevel)
                    debugger;

                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proved by trying to construct a path from a node in the
                // proof tree to the root node
                if (repd.get(result) > depth + 1 && (stone.hascoords(result) || result * color < 0))
                    tt.set(hashb, color, result, km, rlvl.get(result));

                if (guess) {
                    log && log.write({
                        board: hashb,
                        color: color,
                        guess: guess,
                        result: result
                    });
                }

                tt.move.set(hashb ^ color, result);

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

            let move = yield* solve(color, km || 0, 20);

            if (!Number.isFinite(km)) {
                //debug && (yield 'km not specified, starting another search to find the best move');
                // if it's a loss, see what happens if there are ko treats;
                // if it's a win, try to find a stronger move, when the opponent has ko treats
                const move2 = yield* solve(color, move * color > 0 ? -color : color, 20);

                if (move2 * color > 0 && stone.hascoords(move2))
                    move = move2;
            }

            move = rlvl.set(repd.set(move, 0), 0);

            return typeof args === 'string' ?
                stone.toString(move) :
                move;
        }
    }
}
