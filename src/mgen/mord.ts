module tsumego.mgen {
    // this is something like the sigmoid function
    // to map values to [-1, +1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = (S / x)**2
    const S = (x: number) => x / (1 + sign(x) * x);

    // weights for these parameters were guessed there must be better ones, but
    // so far my attempts to gradient descent to optimal weights haven't succeeded
    const w = [1e-0, -1e-1, 1e-2, 1e-3, 1e-4, -1e-5, 1e-6];

    export class MvsOrd {
        /** Defines the order in which the solver considers moves. */
        private sa = new SortedArray<stone>();

        constructor(private board: Board, private target: stone, private safe?: (s: stone) => boolean) {

        }

        reset() {
            return this.sa.reset();
        }

        insert(x: number, y: number, color: number) {
            const board = this.board;

            // it's tempting to skip here clearly dumb moves,
            // such as filling a sure eye, but it appears that
            // this little check spends 40% of the solver's time
            // and removing it makes the solver 1.4x faster
            if (0 && isDumb(board, x, y, color, this.safe))
                return false;

            const s = stone.make(x, y, color);
            const r = board.play(s);

            if (!r) return false; // the move is not playable

            const t = board.get(this.target);
            const n = block.libs(t);

            // there is no point to play self atari moves
            if (t * color > 0 && n < 2) {
                board.undo();
                return false;
            }

            // it's surprising, that with this dumb moves ordering
            // and with the cached tt results, the 1-st move appears
            // to be wrong only in 2% of cases
            const v =
                // maximize the number of captured stones first
                + w[0] * S(board.nstones(+color) - board.nstones(-color))

                // minimize the number of own blocks in atari
                + w[1] * S(board.natari(+color))

                // minimize/maximize the number of libs of the target
                + w[2] * S(n * color * sign(t))

                // maximize the number of own liberties
                + w[3] * S(sumlibs(board, +color))

                // maximize the number of the opponent's blocks in atari
                + w[4] * S(board.natari(-color))

                // minimize the number of the opponent's liberties
                + w[5] * S(sumlibs(board, -color))

                // if everything above is the same, pick a random move
                + w[6] * S(random() - 0.5);
            
            this.sa.insert(s, [v]);
            board.undo();
            return true;
        }
    }
}
