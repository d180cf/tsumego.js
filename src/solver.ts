module tsumego {
    /**
     * Represets a tsumego: the board + the internal state,
     * such as the sequence of played moves and the cache
     * of solved positions.
     *
     * @example
     *
     *  problem = new Solver('(;FF[4]SZ[9]'
     *      + 'MA[ch]' // the target
     *      + 'AB[ae][be][ce][de][ee][ef][cg][eg][fg][fh][gh][hh][ai][ei][hi]'
     *      + 'AW[dg][ah][bh][ch][eh][di]');
     *
     *  move = problem.solve('W'); // W[bf] - W kills the group with [bf]
     *  problem.play(move); // true
     *  problem.solve('B'); // null, B cannot save the group
     *  problem.treats('B'); // B[cd], B[ef], etc. - moves that need a response from W
     *  problem.solve('W'); // W[] - W can pass and still take the group
     */
    export class Solver {
        private args: Args;

        get board() {
            return this.args.board;
        }

        constructor(args: string | Args) {
            if (typeof args === 'string') {
                const sgf = SGF.parse(args);

                if (!sgf)
                    throw SyntaxError('Invalid SGF.');

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

                const target = exec(
                    () => stone.fromString(sgf.get('MA')[0]),
                    'MA[xy] must specify the target white stone.');

                if (errors.length)
                    throw SyntaxError('The SGF does not correctly describe a tsumego:\n\t' + errors.join('\n\t'));

                const tb = board.get(target);

                args = {
                    color: null,
                    board: board,
                    tt: new TT,
                    expand: mgen.fixed(board, target),
                    target: target,
                };
            }

            this.args = args;
        }

        toString() {
            return this.args.board.toString();
        }

        /**
         * Adds a stone if it doesn't violate the rules.
         *
         * This method allows to repeat previous positions,
         * and in particular it allows to immediately recapture
         * a stone (aka "ko").
         *
         * @example
         *
         *  play('W[ea]') == true; // the move has been added
         *  play('B[cd]') == false; // this move cannot be played
         */
        play(move: string | stone) {
            if (typeof move === 'string') {
                move = stone.fromString(move);

                if (!move)
                    throw Error('Invalid move format. Consider W[ea] or B[cd].');
            }

            return this.args.board.play(move) > 0;
        }

        /**
         * Reverts the last move and returns it.
         *
         * @example
         *
         *  play("W[ea]");
         *  undo() == "W[ea]";
         *  undo() == null; // nothing to undo
         */
        undo() {
            const move = this.args.board.undo();
            return stone.toString(move);
        }

        /**
         * Finds the best move for the specified player.
         * This method takes external ko treats into
         * account: if there is a solution that needs
         * external ko treats and another solution that
         * doesn't need them, the latter will be chosen.
         *
         * @example
         *
         *  solve("B") == "B[ea]"; // the best move for black
         *  solve("W") == null; // there is no good move for white
         */
        solve(player: 'W' | 'B'): string;
        solve(color: color, km?: number): stone;

        solve(player: string | color, km?: number) {
            const color = typeof player === 'string' ? stone.label.color(player) : player;

            if (!color)
                throw Error('Invalid color value. Consider W or B.');

            const _args = Object.assign({}, this.args);

            _args.color = color;
            _args.km = km;

            const move = solve(_args);

            return typeof player === 'number' ? move : move * color > 0 ? stone.toString(move) : '';
        }

        g_solve(color: string | color, args?) {
            if (typeof color === 'string') {
                color = stone.label.color(color);

                if (!color)
                    throw Error('Invalid color value. Consider W or B.');
            }

            const _args = Object.assign({}, this.args, args);

            _args.color = color;

            if (_args.benson)
                _args.alive = (b: Board) => tsumego.benson.alive(b, _args.target);

            return solve.start(_args);
        }

        /**
         * Finds all possible threats for the specified player.
         * A threat is a move that doesn't work by itself, but
         * if the opponent ignores it, the next move does work.
         *
         * If solve(...) finds that there is no solution, this
         * method can tell what are the strongest, but not working,
         * moves for that player.
         *
         * @example
         *
         *  for (const move of threats("W")) {
         *    move; // "W[ea]"
         *  }
         */
        *threats(color: string | color) {
            if (typeof color === 'string') {
                color = stone.label.color(color);

                if (!color)
                    throw Error('Invalid color value. Consider W or B.');
            }

            for (const move of this.args.expand(color)) {
                if (this.args.board.play(move)) {
                    const resp = this.solve(color);
                    this.args.board.undo();

                    if (resp * color > 0)
                        yield stone.toString(move);
                }
            }
        }

        /**
         * Returns all correct moves.
         *
         * @example
         *
         *  for (const move of proofs("W")) {
         *      console.log(move + " works for W");
         *  }
         */
        proofs(player: 'W' | 'B'): Iterable<string>;
        proofs(player: color): Iterable<stone>;

        *proofs(player: string | color) {
            const color = typeof player === 'string' ?
                stone.label.color(player) :
                player;

            if (!color)
                throw Error('Invalid color value. Consider W or B.');

            const move = this.solve(color);
            const km = stone.km.get(move);

            if (move * color < 0)
                return;

            for (const move of this.args.expand(color)) {
                if (!this.play(move))
                    continue;

                // can the opponent win with the same km level?
                const resp = this.solve(-color, km);

                this.undo();

                if (resp * color > 0) {
                    // tsc@2.0.0 doesn't see that this yield either
                    // always returns a string or always returns stone;
                    // so the derived return type is Iterable<string|stone>
                    // which is compatible neither with Iterable<string>
                    // or Iterable<stone>
                    yield <any>(typeof player === 'string' ?
                        stone.toString(move) :
                        move);
                }
            }
        }

        /**
         * Constructs a proof tree:
         *
         *  - for every wrong move the tree has a disproof
         *  - for every correct move the tree has a strongest response
         *
         * Returns the tree of moves in the SGF format.
         *
         * @example
         *
         *  tree('W', 2) == `
         *      (;W[ea];B[cb]
         *          (;W[gg];B[aa])
         *          (;W[ge];B[ad]))
         *      (;W[fc];B[dd]
         *          (;W[gc];B[ac])))
         *      (;W[ae];B[gh])
         *  `;
         */
        *tree(player: string | color, depth: number) {
            const color = typeof player === 'string' ? stone.label.color(player) : player;

            if (!color)
                throw Error('Invalid color value. Consider W or B.');

            // first find the best solution, see if
            // it even exists and see who needs
            // to be the ko master; i.e. if the found
            // solution is "B wins even if W is the km"
            // then there will be no point to consider
            // variations in which B wins when B is the km
            const move = this.solve(color);
            const km = stone.km.get(move);

            if (move * color < 0)
                throw Error('There is no correct variation here.');

            interface Tree {
                [move: string]: Tree;
            }

            const self = this;
            const cache = {}; // contuations chosen by the user
            const board = this.args.board;
            const target = this.args.target;
            const expand = this.args.expand;
            const pathto = new WeakMap<Tree, string>();
            const parent = new WeakMap<Tree, Tree>();
            const correct = new WeakMap<Tree, boolean>();
            const terminal = new WeakMap<Tree, boolean>();
            const treesize = new WeakMap<Tree, number>();

            function add(tree: Tree, move: string | stone): Tree {
                if (typeof move === 'number')
                    move = stone.toString(move);

                const node = {};
                tree[move] = node;
                parent.set(node, tree);
                pathto.set(node, (pathto.get(tree) || '') + ';' + move);

                for (let x = node; x; x = parent.get(x))
                    treesize.set(x, (treesize.get(x) || 0) + 1);

                return node;
            }

            class UserError extends Error {
                constructor() {
                    super();
                }
            }

            // adds a disproof for every wrong move and
            // a strongest response for every correct move
            function* deepen(this: void, tree: Tree, color: color) {
                const sgf = board.sgf;

                for (const move of expand(color)) {
                    if (board.play(move)) {
                        const subtree = add(tree, move);

                        if (yield pathto.get(subtree))
                            throw new UserError;

                        const dead = !board.get(target);
                        const resp = !dead && self.solve(-color, km);

                        if (dead || resp * color > 0) {
                            // this is a correct move: add strongest responses                            
                            correct.set(subtree, true);

                            if (!dead) {
                                let hasThreats = false;

                                // check if there are any threats before
                                // bothering the user to pick one
                                for (const threat of self.threats(-color)) {
                                    hasThreats = true;
                                    break;
                                }

                                if (hasThreats) {
                                    // ask the UI to give the best response;
                                    // another option would be to somehow rank
                                    // moves returned by threats(-color) and
                                    // pick the stongest one
                                    const threat = board.hash in cache ?
                                        cache[board.hash] : // don't bother the user twice for the same position
                                        yield stone.label.string(-color);

                                    cache[board.hash] = threat;

                                    // the UI gives null if the variation needs to end here
                                    if (threat)
                                        add(subtree, threat);
                                }
                            }

                            // now this player can ignore any next move:
                            // no need to deepen further this branch
                            if (leaf(subtree))
                                terminal.set(subtree, true);
                        } else if (!stone.hascoords(resp)) {
                            // hmm.. the opponent needs to pass; this usually happens
                            // when the result is seki, but also might happen when the
                            // opponent needs to drop external ko treats and recapture
                            terminal.set(subtree, true);
                        } else {
                            // this is wrong move: add the found disproof;
                            // but before that check if the opponent even
                            // needed a response: maybe this move is so wrong
                            // that doesn't do anything at all
                            const pass = self.solve(color, km);

                            if (pass * color > 0) {
                                add(subtree, resp);
                                board.play(resp);

                                // detect a basic ko and stop the variation
                                if (sgf == board.sgf)
                                    terminal.set(subtree[stone.toString(resp)], true);

                                board.undo();
                            } else {
                                // the move is dumb and can be ignored
                                terminal.set(subtree, true);
                            }
                        }

                        board.undo();
                    }
                }
            }

            function* leaves(this: void, tree: Tree): Iterable<Tree> {
                for (const move in tree) {
                    if (!board.play(stone.fromString(move)))
                        debugger; // the tree is messed up

                    yield* leaves(tree[move]);
                    board.undo();
                }

                // danger: this should be at the end,
                // as otherwise the caller may insert
                // subnodes and for-in above will happily
                // list them as well
                if (leaf(tree))
                    yield tree;
            }

            const root: Tree = {};

            for (let d = 0; d < depth; d++) {
                console.log('working on level ' + d);
                const size = treesize.get(root);

                for (const leaf of leaves(root)) {
                    if (terminal.get(leaf))
                        continue;

                    try {
                        yield* deepen(leaf, color);
                    } catch (err) {
                        if (err instanceof UserError)
                            break; // user has lost patience

                        throw err;
                    }
                }

                // nothing has been added: no need to proceed;
                // usually, variations end at depth 14-15, if
                // no static analysis is applied
                if (treesize.get(root) == size) {
                    console.log('variations ended here');
                    break;
                }
            }

            function width(tree: Tree) {
                return Object.keys(tree).length;
            }

            function leaf(tree: Tree) {
                return width(tree) < 1;
            }

            // the idea is to detect branches like (;B[ef]C[RIGHT];W[fg])
            // the W[fg] move is really not needed there
            function final(tree: Tree) {
                for (const move in tree)
                    if (!leaf(tree[move]))
                        return false;

                return true;
            }

            return (function stringify(tree: Tree, d = 0) {
                const vars: string[] = [];

                for (const move in tree) {
                    const subtree = tree[move];

                    // there is no point to explicitly list wrong moves, e.g. ;B[ef];W[cc];B[df]C[WRONG]
                    if (stone.fromString(move) * color > 0 && !correct.has(subtree) && leaf(subtree))
                        continue;

                    let line = ';' + move;
                    let notes = [];

                    if (correct.get(subtree)) {
                        if (leaf(subtree) || final(subtree))
                            notes.push('RIGHT'); // C[RIGHT] tells goproblems that this is a correct final move
                        else
                            notes.push('+'); // simplifies debugging
                    }

                    // attach the size of the subtree
                    if (treesize.get(subtree))
                        notes.push('size = ' + treesize.get(subtree));

                    // e.g. C[comment #1][comment #2]...
                    if (notes.length > 0)
                        line += 'C' + notes.map(s => '[' + s + ']').join('');

                    // a correct line should end with a correct move;
                    // a wrong line should end with a disproving move
                    if (!correct.has(subtree) || !final(subtree))
                        line += stringify(subtree, d + 1);

                    vars.push(line);
                }

                if (vars.length < 2)
                    return vars.join('');

                return vars.map(s => '\n' + '  '.repeat(d) + '(' + s + ')').join('');
            })(root);
        }
    }
}
