/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="dcnn.ts" />
/// <reference path="gf2.ts" />

module tsumego {
    const infdepth = 255;
    const maxdpn = 99;

    module repd {
        export const get = move => move >> 8 & 255;
        export const set = (move, repd) => move & ~0xFF00 | repd << 8;
    }

    interface Node {
        hash: number;
        play(move: stone): number;
        undo(): stone;
    }

    function comment(text: string, args?) {
        if (!args) return text;

        text = text.replace(/\${(.+?)}/gm, (_, name) => args[name]);

        return Object.assign({
            toString() {
                return text + ' ' + JSON.stringify(args, null, 4);
            }
        }, args);
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
            debug?: {
                update?(path: number[], data?): void;
            };
            unodes?: {
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

            const path: number[] = []; // path[i] = hash of the i-th position
            const tags: number[] = []; // tags[i] = hash of the path to the i-th position

            // keeps (dis)proof numbers as well as the min distance form the root: [pn, dn, md]
            const pdns: { [nhash: number]: [number, number, number] } = {};

            const hcval = rand();
            const nhash = (board: number, color: number) => color > 0 ? board : board ^ hcval;

            // returns 0 if the node cannot be solved within the given pn/dn constraints
            function* solve(color: number, nkt: number, pmax: number, dmax: number, mind: number) {
                const depth = path.length;
                const prevb = depth < 1 ? 0 : path[depth - 1];
                const hashb = board.hash;
                const ttres = tt.get(hashb, color, nkt);

                stats && (stats.depth = depth, yield);

                if (ttres) {
                    debug && (yield 'reusing cached solution: ' + stone.toString(ttres));
                    return repd.set(ttres, infdepth);
                }

                {
                    const [p = 1, d = 1] = pdns[nhash(hashb, color)] || [];

                    debug && debug.update([...path, hashb], {
                        pn: p,
                        dn: d,
                        pmax: pmax,
                        dmax: dmax
                    });

                    if (p > pmax || d > dmax) {
                        debug && (yield `${p} > ${pmax} or ${d} > ${dmax}`);
                        return 0;
                    }
                }

                if (unodes)
                    unodes.size++;

                let result: stone = 0;
                let mindepth = infdepth;

                interface Node {
                    board: number;
                    nkt: number;
                    move: stone;
                    wins: number;
                    repd: number;
                }

                /** Once a node is solved, it's removed from the list. */
                const nodes: Node[] = [];

                for (const move of expand(board, color)) {
                    board.play(move);
                    const hash = board.hash;
                    board.undo();

                    let d = depth - 1;

                    while (d >= 0 && path[d] != hash)
                        d = d > 0 && path[d] == path[d - 1] ? -1 : d - 1;

                    d = d + 1 || infdepth;

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

                    const newnkt = d <= depth ? nkt - color : nkt;
                    const cached = tt.get(hash, -color, newnkt);

                    nodes.push({
                        board: hash,
                        nkt: newnkt,
                        move: repd.set(move, d),
                        wins: stone.color(cached) * color,
                        repd: d
                    });
                }

                // Consider making a pass as well. Passing locally is like
                // playing a move elsewhere and yielding the turn to the 
                // opponent locally: it doesn't affect the local position,
                // but resets the local history of moves. This is why passing
                // may be useful: a position may be unsolvable with the given
                // history of moves, but once it's reset, the position can be
                // solved despite the move is yilded to the opponent.
                nodes.push({
                    board: hashb,
                    nkt: nkt,
                    move: 0,
                    wins: 0,
                    repd: infdepth
                });

                while (true) {
                    let node: Node; // it has the smallest dn                                    
                    let pn0 = Infinity; // = min dn <= pmax
                    let dns = 0; // = sum pn <= dmax
                    let dnm = 0; // = max pn, if all nodes are old
                    let md0 = Infinity; // = min md, if all nodes are old
                    let dn2 = Infinity; // the next smallest dn after pn0
                    let pnc: number; // pn of the chosen node

                    const pdn1 = [];

                    for (const x of nodes) {
                        const [p = 1, d = 1, md = mind + 1] = pdns[nhash(x.board, -color)] || [];

                        let dbgs = `${stone.toString(x.move)} p=${p} d=${d} md=${md}`;

                        debug && debug.update([...path, hashb, x.board], {
                            pn: p,
                            dn: d,
                            md: md
                        });

                        if (md > mind) // if the node is new...
                            dns += p;
                        else
                            dnm = max(dnm, p), md0 = min(md0, md), dbgs += ` <= ${mind}`;

                        pdn1.push(dbgs);

                        if (d < pn0) {
                            node = x, dn2 = pn0, pn0 = d, pnc = p;
                        } else {
                            if (d < dn2)
                                dn2 = d;

                            // this check must respect the existing order of nodes given by expand(...)
                            if (d == pn0 && (node.wins - x.wins || node.repd - x.repd) < 0)
                                node = x, pnc = p;
                        }
                    }

                    // to make dfpn handle repetitions the disproof number of the parent
                    // node is computed with a slightly modified formula:
                    //
                    //  dn0 = sum pn, of all nodes that are new, i.e. have md > mind
                    //  dn0 = max pn, if all nodes are old, i.e. they have md <= mind
                    //
                    // the proof number is computed as usual, as the min of disproof numbers
                    const dn0 = dns > 0 ? dns : (mind = md0, dnm);

                    const mvstr = node && node.move ? stone.toString(node.move) : (color > 0 ? 'B' : 'W') + '[--]';

                    if (debug) {
                        debug.update([...path, hashb], {
                            pmax: pmax,
                            dmax: dmax,
                            pn: pn0,
                            dn: dn0
                        });

                        node && debug.update([...path, hashb, node.board]);

                        if (dn0 > dmax || pn0 > pmax) {
                            yield comment(`${mvstr} exceeded pmax=${pmax} dmax=${dmax}`, {
                                pmax: pmax,
                                dmax: dmax,
                                moves: pdn1
                            });
                            break;
                        } else {
                            yield comment(`taking ${mvstr}`, {
                                pmax: pmax,
                                dmax: dmax,
                                moves: pdn1
                            });
                        }
                    }

                    // these are pn/dn constraints for the chosen node:
                    // once they are exceeded, the solver comes back
                    // and picks the next node with the samllest dn
                    const pmax1 = dmax - (dn0 - pnc);
                    const dmax1 = min(pmax, dn2);

                    const d = node.repd;
                    const move = node.move;

                    // this is a hash of the path: reordering moves must change the hash;
                    // 0x87654321 is meant to be a generator of the field, but I didn't
                    // know how to find such a generator, so I just checked that first
                    // million powers of this element are unique
                    const h = gf32.mul(prevb != hashb ? prevb : 0, 0x87654321) ^ hashb;

                    tags.push(h & ~15 | (nkt & 7) << 1 | (color < 0 ? 1 : 0));
                    path.push(hashb);
                    stats && stats.nodes++;

                    let s: stone; // can be zero if solving exceeds pn/dn thresholds

                    if (!move) {
                        debug && (yield stone.toString(stone.nocoords(color)) + ' passes');
                        const i = tags.lastIndexOf(tags[depth], -2);

                        if (i >= 0) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = repd.set(stone.nocoords(status(board)), i + 1);
                        } else {
                            // play a random move elsewhere and yield
                            // the turn to the opponent; playing a move
                            // elsewhere resets the local history of moves
                            s = yield* solve(-color, nkt, pmax1, dmax1, mind + 1);
                        }

                        debug && s && (yield 'the outcome of passing: ' + stone.toString(s));
                    } else {
                        board.play(move);
                        debug && (yield stone.toString(move));

                        s = status(board) * target < 0 ? repd.set(stone.nocoords(-target), infdepth) :
                            // white has secured the group: black cannot
                            // capture it no matter how well it plays
                            color * target > 0 && alive && alive(board) ? repd.set(stone.nocoords(target), infdepth) :
                                // let the opponent play the best move
                                d > depth ? yield* solve(-color, nkt, pmax1, dmax1, mind + 1) :
                                    // this move repeat a previously played position:
                                    // spend a ko treat and yield the turn to the opponent
                                    yield* solve(-color, nkt - color, pmax1, dmax1, mind + 1);

                        debug && s && (yield 'the outcome of this move: ' + stone.toString(s));
                        board.undo();
                    }

                    path.pop();
                    tags.pop();

                    // if the node is solved, it must be removed
                    if (s) nodes.splice(nodes.indexOf(node), 1);

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

                if (result * color > 0)
                    pdns[nhash(hashb, color)] = [0, maxdpn, mind];

                if (result * color < 0)
                    pdns[nhash(hashb, color)] = [maxdpn, 0, mind];

                if (!result && nodes.length) {
                    let dmin = Infinity;
                    let psum = 0;
                    let pmax = 0;
                    let mdmin = Infinity;

                    for (const x of nodes) {
                        const [p = 1, d = 1, md = mind + 1] = pdns[nhash(x.board, -color)] || [];

                        if (md > mind)
                            psum += p;
                        else
                            pmax = max(pmax, p), mdmin = min(mdmin, md);

                        dmin = min(dmin, d);
                    }

                    pdns[nhash(hashb, color)] = psum > 0 ?
                        [dmin, psum, mind] :
                        [dmin, pmax, mind = mdmin];
                }

                if (debug && debug.update) {
                    const [p, d, md] = pdns[nhash(hashb, color)];

                    debug.update([...path, hashb], {
                        pn: p,
                        dn: d,
                        md: md
                    });
                }

                // if all moves and passing have been proven to be a loss...
                if (!result && !nodes.length)
                    result = repd.set(stone.nocoords(-color), mindepth);

                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proved by trying to construct a path from a node in the
                // proof tree to the root node
                if (repd.get(result) > depth + 1)
                    tt.set(hashb, color, result, nkt);

                if (result && debug)
                    yield comment(`solved: ${stone.toString(result)}`);

                return result;
            }

            {
                const moves: stone[] = [];
                let move: stone;

                while (move = board.undo())
                    moves.unshift(move);

                for (move of moves) {
                    path.push(board.hash);
                    board.play(move);
                }

                move = yield* solve(color, nkt, maxdpn, maxdpn, 0);

                return typeof args === 'string' ?
                    stone.toString(move) :
                    move;
            }
        }
    }
}
