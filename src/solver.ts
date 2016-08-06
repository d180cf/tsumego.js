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
        solve(color: string | color) {
            if (typeof color === 'string') {
                color = stone.label.color(color);

                if (!color)
                    throw Error('Invalid color value. Consider W or B.');
            }

            const _args = Object.assign({}, this.args);

            _args.color = color;

            const move = solve(_args);

            return move * color > 0 ? stone.toString(move) : '';
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
         * Finds all possible treats for the specified player.
         * A treat is a move that doesn't work by itself, but
         * if the opponent ignores it, the next move will work.
         *
         * If solve(...) finds that there is no solution, this
         * method can tell what are the strongest, but not working,
         * moves for that player.
         *
         * @example
         *
         *  for (const move of treats("W")) {
         *    move; // "W[ea]"
         *  }
         */
        *treats(color: string | color) {
            if (typeof color === 'string') {
                color = stone.label.color(color);

                if (!color)
                    throw Error('Invalid color value. Consider W or B.');
            }

            for (const move of this.args.expand(color)) {
                if (this.args.board.play(move)) {
                    try {
                        const resp = this.solve(color);

                        if (stone.fromString(resp) * color > 0)
                            yield stone.toString(move);
                    } finally {
                        this.args.board.undo();
                    }
                }
            }
        }
    }
}
