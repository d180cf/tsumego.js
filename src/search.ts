/// <reference path="stat.ts" />
/// <reference path="color.ts" />
/// <reference path="pattern.ts" />
/// <reference path="dumb.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="dcnn.ts" />
/// <reference path="gf2.ts" />
/// <reference path="eulern.ts" />
/// <reference path="eyeness.ts" />
/// <reference path="nhashmap.ts" />

module tsumego.stat {
    export var ttinvalid = 0;
    logv.push(() => `invalid tt entires = ${ttinvalid}`);

    export var calls = 0;
    logv.push(() => `calls to solve = ${(calls / 1e6).toFixed(1)} M`);

    export var ucresult = 0;
    logv.push(() => `uncondtional results = ${ucresult / calls * 100 | 0} %`);

    export var expand = 0;
    logv.push(() => `calls to expand = ${expand / calls * 100 | 0} %`);

    export var nwins = 0;
    logv.push(() => `chances that a node is winning = ${nwins / expand * 100 | 0} %`);

    export var nmoves = 0;
    logv.push(() => `avg number of moves = ${(nmoves / expand).toFixed(1)}`);

    export var nwmoves = 0;
    logv.push(() => `avg number of moves when winning = ${(nwmoves / nwins).toFixed(1)}`);

    export var nm2win = 0;
    logv.push(() => `avg number of moves to win = ${(nm2win / nwins).toFixed(1)}`);

    export var sdepth = 0;
    logv.push(() => `avg depth at expand = ${sdepth / expand | 0}`);

    export var maxdepth = 0;
    logv.push(() => `max depth at expand = ${maxdepth}`);
}

module tsumego {
    export interface DebugState {
        km?: number;
        dmax?: number;
        vmin?: number;
        vmax?: number;
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
        values: NodeHashMap<number>; // that's a cache for eval(...)
        expand: mgen.Generator;
        eulern?: boolean;
        npeyes?: boolean;
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
            const {board, tt, values, log, expand, debug, time, eulern, npeyes} = args;

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

            const sa = new SortedArray<[stone, number]>();
            const evalnode = evaluate(board, target, values);
            const eulerval = new EulerN(board, sign(target));
            const pec = npeyes && eyeness(board, expand(0), expand.safe);

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // this is to detect long loops, e.g. the 10,000 year ko
            const hist: stone[] = []; // the sequence of moves that leads to the current position

            // 75% of the time the solver spends in this loop;
            // also, it's funny that in pretty much all cases
            // a for-of is slower than the plain for loop, but
            // in this case it's the opposite: for-of is way
            // faster for some mysterious reason; also v8 jit
            // doesn't optimize functions with yield, so it's
            // profitable to move out this chunk of code into
            // a plain function without yield/yield* stuff, but
            // this gives only a marginal profit
            function genmoves(color: color, km: color, dmax: number) {
                stat.expand++;

                const nodes = sa.reset();
                const depth = path.length;
                const hash_b = board.hash_b;
                const hash_w = board.hash_w;

                let rdmin = infdepth; // the earliest repetition

                const moves: stone[] = [];

                for (const move of expand(color))
                    if (!board.get(move))
                        moves.push(move);

                if (eulern && color * target > 0 && moves.length > 3)
                    eulerval.reset();

                // if tt has a cached result, it often appears correct
                const guess = moves.length < 8 ? stone.empty :
                    (tt.get(color, hash_b, hash_w) || TT.empty).move;

                for (const move of moves) {
                    const nres = board.play(move);

                    if (!nres)
                        continue;

                    const value = -evalnode(-color);
                    const eulerv = eulern && color * target > 0 && moves.length > 3 ? eulerval.value(move, nres) : 0;
                    const npeyes = pec ? pec(sign(target)) : 0;
                    const hash_b = board.hash_b;
                    const hash_w = board.hash_w;
                    const hash32 = board.hash;

                    board.undo();

                    // -1 indicates a sure loss
                    if (value <= -1)
                        continue;

                    // skip moves that are known to be losing
                    const ttres = tt.get(-color, hash_b, hash_w, { dmax: dmax, km: km });

                    if (ttres && ttres.type == 0 && ttres.value == +1)
                        continue;

                    let d = depth - 1;

                    while (d >= 0 && path[d] != hash32)
                        d = d > 0 && path[d] == path[d - 1] ? -1 : d - 1;

                    d = d + 1 || infdepth;

                    // there are no ko treats to play this move,
                    // so play a random move elsewhere and yield
                    // the turn to the opponent; this is needed
                    // if the opponent is playing useless ko-like
                    // moves that do not help even if all these
                    // ko fights are won
                    if (d <= depth && km * color <= 0) {
                        rdmin = min(rdmin, d);
                        continue;
                    }

                    sa.insert([move, d], [
                        // moves that require a ko treat are considered last
                        // that's not just perf optimization: the search depends on this
                        - 1 / d

                        // tt guesses the correct winning move in 83% of cases,
                        // but here this heuristics makes no difference at all
                        + 8 ** -1 * (guess * color > 0 && stone.same(guess, move) ? 1 : 0)

                        // first consider moves that lead to a winning position
                        // use previously found solution as a hint; this makes
                        // a huge impact on the perf: not using this trick
                        // makes the search 3-4x slower
                        + 8 ** -2 * sign(moves.length > 3 ? -(tt.get(-color, hash_b, hash_w) || TT.empty).value : 0)

                        // increase eyeness of the target group
                        + 8 ** -3 * sigmoid(npeyes * sign(target) * color)

                        // now consider the evaluation of this position
                        + 8 ** -4 * value

                        // the euler number is the number of objects
                        // minus the number of holes; it pretty much
                        // estimates the eyeness of the target group;
                        // however as of now this heuristics doesn't
                        // do much; maybe it'll be useful once iterative
                        // deepening search is implemented
                        + 8 ** -7 * sigmoid(eulerv * color * sign(target))

                        // if everything above is the same, pick a random move;
                        // in JS floating point numbers are 64 bit with 53 bits
                        // in the significant precision; this means that the
                        // this smallest term can be at most 2**52 times smaller
                        // then the biggest term (which is -1/d) as otherwise
                        // this small random addition will be lost; also, the
                        // number of digits (binary digits) in this random
                        // addition should be sufficiently large; here the 8**15
                        // factor leaves it 52 - 3 * 15 = 7 digits, which lets
                        // the random term have 128 possible values
                        + 8 ** -15 * (random() - 0.5)
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
                    nodes.push([stone.nocoords(color), infdepth]);

                return { moves: nodes, rdmin: rdmin };
            }

            // Finds a move with the highest value given the [vmin, vmax] constraints.
            // The returned value looks like [move, maxv, dmin, dmax] where
            //
            //  - move - It's always of the same color, but may have no coords when it's more profitable to pass.
            //  - maxv - The value of the move where -1 indicates a sure loss, +1 indicates a sure win.
            //  - dmin - The earliest position in the path that this solution depends on; infdepth for unconditional results.
            //  - dmax - The move is valid if the search is made with depth <= dmax; infdepth for unconditional results.
            //
            // In most cases the the search reaches the given max depth and returns an estimate,
            // so the result looks like [W[fc], 0.56, 255, 15] which means that the move has
            // decent chances to win, but is not an exact solution (0.56 < 1), the solution
            // does not depend on a path leading to the current node (255) and the node values
            // were estimated at depth 15, meaning that a deeper search may change the result.
            function* solve(color: color, km: color, dmax: number, vmin: number, vmax: number) {
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

                const depth = path.length; // does not include the current node
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hash32 = board.hash;
                const hash_b = board.hash_b;
                const hash_w = board.hash_w;
                const ttres = tt.get(color, hash_b, hash_w, { dmax: dmax, km: km });

                if (debug) {
                    debug.color = color;
                    debug.depth = depth;
                    debug.moves = hist;
                    debug.path = path;
                    debug.dmax = dmax;
                    debug.vmin = vmin;
                    debug.vmax = vmax;
                    debug.km = km;
                }

                // this result doesn't depend on the path leading to this node
                if (ttres) {
                    const move = ttres.move;

                    if (stone.hascoords(move) && board.get(move)) {
                        // due to collisions, tt may give a result for a different position;
                        // however with 64 bit hashes, there expected to be one collision
                        // per several billion nodes
                        stat.ttinvalid++;
                    } else {
                        // this is a lower bound
                        if (ttres.type < 0)
                            vmin = max(vmin, ttres.value);

                        // this is an upper bound
                        if (ttres.type > 0)
                            vmax = min(vmax, ttres.value);

                        // this is an exact result
                        if (ttres.value == 0 || vmin >= vmax)
                            return [move, ttres.value, infdepth, ttres.dmax];
                    }
                }

                // once the search horizon is reached, return an estimated value of the node;
                // here it would be better, actually, to start a quick "quiescence search" that
                // would check if the target can be put in atari or can avert an atari; this
                // would be a lambda-1 search
                if (dmax < 1)
                    return [0, evalnode(color), infdepth, 0];

                // generate moves and find the earliest repetition;
                // moves that cause those repetitions may not be in this list
                const {moves, rdmin} = genmoves(color, km, dmax);

                stat.maxdepth = max(stat.maxdepth, depth);
                stat.sdepth += depth;
                stat.nmoves += moves.length;

                const _vmin = vmin;

                let best = stone.nocoords(color); // the move with the highest value
                let dmin = rdmin; // earliest repetition
                let maxv = -1; // value of the best move
                let maxd = infdepth;

                let attempt = 0;

                // stop when either a winning move is found or when the last found move
                // exceeds the upper bound set by the caller; e.g. if the caller
                // has found a move W[ab] with value = -0.2 and now it's investigating this
                // move W[cd] in hope that its value > -0.2 and it's appeared that W[cd]
                // has a continuation B[fe] with value > 0.25, the caller doesn't care
                // if the actual value of W[cd] is 0.99 or just 0.25, because it already knows
                // that W[cd] is clearly inferior to W[ab] and it needs to try something else
                while (attempt < moves.length && vmin < vmax) {
                    const [move, d] = moves[attempt++];

                    // response from the opponent
                    let resp: stone;
                    let rval: number;
                    let rmin: number;
                    let rmax: number;

                    path.push(hash32);
                    hist.push(move);
                    stone.hascoords(move) && board.play(move);
                    debug && (yield `${stone.toString(move)}`);

                    // handling passes is surprisingly tricky...
                    if (!stone.hascoords(move)) {
                        const nextkm = prevb == hash32 && color * km < 0 ? 0 : km;
                        const tag = hash32 & ~15 | (-color & 3) << 2 | nextkm & 3; // tells which position, who plays and who is the km
                        const isloop = tags.lastIndexOf(tag) >= 0;

                        if (isloop) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            resp = stone.nocoords(-color);
                            rmin = depth;
                            rval = color * target > 0 ? -1 : +1;
                            rmax = infdepth;
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
                            [resp, rval, rmin, rmax] = yield* solve(-color, nextkm, dmax - 1, -vmax, -vmin);
                            tags.pop();
                        }
                    }

                    if (stone.hascoords(move)) {
                        if (!board.get(target)) {
                            resp = stone.nocoords(-color);
                            rval = color * target > 0 ? -1 : +1;
                            rmin = infdepth;
                            rmax = infdepth;
                        } else if (color * target > 0 && alive && alive(board)) {
                            resp = stone.nocoords(-color);
                            rval = color * target > 0 ? +1 : -1;
                            rmin = infdepth;
                            rmax = infdepth;
                        } else {
                            [resp, rval, rmin, rmax] = yield* solve(-color, km, dmax - 1, -vmax, -vmin);
                        }
                    }

                    path.pop();
                    hist.pop();
                    stone.hascoords(move) && board.undo();
                    debug && (yield `${stone.toString(move)} \u27f6 ${stone.toString(resp)} v = ${rval} d = ${rmax}`);

                    vmin = max(vmin, -rval);

                    if (-rval >= maxv) {
                        maxv = -rval;
                        best = move;
                        dmin = min(dmin, rmin);
                        maxd = min(infdepth, stone.hascoords(move) ? rmax + 1 : rmax);
                    }
                }

                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proven by trying to construct a path from a node in the
                // proof tree to the root node; about 97% of the solutions do not
                // depend on such repetitions
                if (dmin > depth) {
                    stat.ucresult++;

                    let type = 0;

                    // all moves were tried, but the best result didn't even reach vmin;
                    // since widening the [vmin, vmax] window will only make the result
                    // worse (since the opponent will have more freedom), the found value
                    // is the upper bound:
                    if (maxv <= _vmin && _vmin > -1)
                        type = +1;

                    // the value of the found move is higher than the upper bound set
                    // by the caller; other moves may have even higher values, but they
                    // weren't investigated; hence the found value is the lower bound:
                    if (maxv >= vmax && vmax < +1)
                        type = -1;

                    tt.set(color, hash_b, hash_w, {
                        move: best,
                        dmax: maxd,
                        value: maxv,
                        type: type,
                        km_b: km,
                        km_w: km,
                    });
                }

                return [best, maxv, dmin, maxd];
            }

            function* _solve(color: color, km: color) {
                let move = stone.empty
                let maxv = 0;
                let dmin = 0;
                let maxd = 0;

                for (let dmax = 1; dmax < infdepth / 2 && maxd < infdepth; dmax++) {                    
                    [move, maxv, dmin, maxd] = yield* solve(color, km, dmax, -1, +1);
                    debug && console.log( 'km = ' + km + ' d <= ' + dmax + ' -> ' + stone.toString(move) + ' v = ' + maxv + ' d = ' + maxd);
                }

                return [move, maxv];
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

            {
                const {color, km} = args;

                let [move, value] = yield* _solve(color, km || 0);

                move = stone.km.set(move, km || 0);

                if (!Number.isFinite(km) && abs(value) == 1) {
                    // if it's a loss, see what happens if there are ko treats;
                    // if it's a win, try to find a stronger move, when the opponent has ko treats
                    const km2 = value > 0 ? -color : color;
                    const [move2, value2] = yield* _solve(color, km2);

                    if (value2 == +1 && stone.hascoords(move2)) {
                        move = move2;
                        value = value2;
                        move = stone.km.set(move, km2);
                    }
                }

                return typeof args === 'string' ?
                    stone.toString(move) :
                    move;
            }
        }
    }
}
