/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
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
     * Stores (dis)proof numbers for investigated nodes.
     * A node is a triple: (board, color, nkt).
     */
    class PDNS {
        private data: { [hash: number]: number } = {};

        private hc = rand();
        private hk = rand();
        private h = [rand(), rand()];

        private hash(hash: number, color: number, nkt: number) {
            assert(nkt > -3 && nkt < +3);

            if (color < 0)
                hash ^= this.hc;

            if (nkt > 0)
                hash ^= this.h[-1 + nkt];

            if (nkt < 0)
                hash ^= this.h[-1 - nkt] ^ this.hk;

            return hash;
        }

        get(board: number, color: number, nkt: number) {
            const h = this.hash(board, color, nkt);
            return this.data[h] || 0;
        }

        set(board: number, color: number, nkt: number, pdn: number) {
            const h = this.hash(board, color, nkt);
            this.data[h] = pdn;
        }
    }

    /**
     * The problem's description is given as an SGF string:
     *
     *      (;FF[4]SZ[9]
     *        AB[aa][bb][cd][ef]
     *        AW[ab][df]
     *        SQ[aa][bb][ab][ba]
     *        MA[ab]
     *        KM[B]
     *        PL[W])
     * 
     * There are a few tags in the SGF that must be present:
     *
     *      SZ  The board size, up to 16 x 16.
     *      AB  The set of black stones.
     *      AW  The set of white stones.
     *      MA  The target that needs to be captured or secured.
     *      SQ  The set of intersections where the solver will play (aka the relevancy zone or the R-zone).
     *      PL  Who plays first.
     *      KM  Who is the ko master (optional).
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
            nkt?: number;
            tt?: TT;
            expand(node: Node, color: number): stone[];
            status(node: Node): number;
            alive?(node: Node): boolean;
            debug?: boolean;
            unodes?: {
                [hash: number]: boolean;
                size: number;
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

            const rzone = exec(
                () => sgf.get('SQ').map(stone.fromString),
                'SQ[xy][..] must tell the set of possible moves.');

            const target = exec(
                () => stone.fromString(sgf.get('MA')[0]),
                'MA[xy] must specify the target white stone.');

            const komaster = exec(
                () => sgf.get('KM') + '' == 'W' ? -2 : +2,
                'KM[W] or KM[B] must tell who is the ko master. This tag is optional.');

            if (errors.length)
                throw SyntaxError('The SGF does not correctly describe a tsumego:\n\t' + errors.join('\n\t'));

            return {
                root: board,
                color: color,
                nkt: komaster,
                expand: generators.Basic(rzone),
                status: (b: Board) => b.get(target) < 0 ? -1 : +1,
                alive: (b: Board) => tsumego.benson.alive(b, target)
            };
        }

        export function* start(args: Args | string) {
            let {root: board, color, nkt = 0, tt = new TT, expand, status, alive, stats, unodes, debug} =
                typeof args === 'string' ? parse(args) : args;

            // cache results from static analysis as it's quite slow
            alive = memoized(alive, board => board.hash);

            // tells who is being captured
            const target = status(board);

            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            const sa = new SortedArray<stone, { d: number, w: number; }>((a, b) =>
                b.d - a.d || // moves that require a ko treat are considered last
                b.w - a.w);  // first consider moves that lead to a winning position

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // tags[i] = hash of the path to the i-th position

            const pn = new PDNS; // proof numbers
            const dn = new PDNS; // disproof numbers

            function* solve(color: number, nkt: number, pmax: number, dmax: number) {
                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const ttres = tt.get(hashb, color, nkt);

                stats && (stats.depth = depth, yield);

                if (unodes) {
                    const h = gf32.mul(board.hash ^ (color > 0 ? 0 : -1), gf32.pow(3, nkt));

                    if (!unodes[h]) {
                        unodes[h] = true;
                        unodes.size++;
                    }
                }

                if (ttres) {
                    debug && (yield 'reusing cached solution: ' + stone.toString(ttres));
                    return repd.set(ttres, infdepth);
                }

                let result: stone;
                let mindepth = infdepth;

                const nodes = sa.reset();

                for (const move of expand(board, color)) {
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
                    if (d <= depth && nkt * color <= 0)
                        continue;

                    // check if this node has already been solved
                    const r = tt.get(hash, -color, d <= depth ? nkt - color : nkt);

                    sa.insert(repd.set(move, d), {
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
                sa.insert(0, { d: infdepth, w: 0 });

                for (const move of nodes) {
                    const d = !move ? infdepth : repd.get(move);
                    let s: stone;

                    // this is a hash of the path: reordering moves must change the hash;
                    // 0x87654321 is meant to be a generator of the field, but I didn't
                    // know how to find such a generator, so I just checked that first
                    // million powers of this element are unique
                    const h = gf32.mul(prevb != hashb ? prevb : 0, 0x87654321) ^ hashb;

                    tags.push(h & ~15 | (nkt & 7) << 1 | (color < 0 ? 1 : 0));
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
                            // elsewhere resets the local history of moves
                            s = yield* solve(-color, nkt, pmax, dmax);
                        }
                    } else {
                        board.play(move);
                        debug && (yield);

                        s = status(board) * target < 0 ? repd.set(stone.nocoords(-target), infdepth) :
                            // white has secured the group: black cannot
                            // capture it no matter how well it plays
                            color * target > 0 && alive && alive(board) ? repd.set(stone.nocoords(target), infdepth) :
                                // let the opponent play the best move
                                d > depth ? yield* solve(-color, nkt, pmax, dmax) :
                                    // this move repeat a previously played position:
                                    // spend a ko treat and yield the turn to the opponent
                                    (debug && (yield 'spending a ko treat'), yield* solve(-color, nkt - color, pmax, dmax));

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
                    tt.set(hashb, color, result, nkt);

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

            move = yield* solve(color, nkt, 1e5, 1e5);

            return typeof args === 'string' ?
                stone.toString(move) :
                move;
        }
    }
}
