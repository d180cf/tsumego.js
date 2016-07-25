module tsumego.mgen {
    // this is something like the sigmoid function
    // to map values to [0, 1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = ((2 * S - 1)/x)**2
    const S = (x: number) => (1 + x / (1 + sign(x) * x)) / 2;

    // weights for these parameters were guessed there must be better ones, but
    // so far my attempts to gradient descent to optimal weights haven't succeeded
    const w = [1e-0, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6];

    export class MvsOrd {
        /** Defines the order in which the solver considers moves. */
        sa = new SortedArray<stone>();

        constructor(private board: Board, private target: stone) {

        }

        reset() {
            return this.sa.reset();
        }

        insert(x: number, y: number, color: number) {
            const board = this.board;

            if (Pattern.isEye(board, x, y, color))
                return false;

            const s = stone.make(x, y, color);
            const r = board.play(s);

            if (!r) return false; // the move is not playable

            try {
                const t = board.get(this.target);
                const n = block.libs(t);

                // there is no point to play self atari moves
                if (t * color > 0 && n < 2)
                    return false;

                // it's surprising, that with this dumb moves ordering
                // and with the cached tt results, the 1-st move appears
                // to be wrong only in 2% of cases
                this.sa.insert(s, [
                    // maximize the number of captured stones first
                    + w[0] * S(r)

                    // minimize the number of own blocks in atari
                    + w[1] * S(-ninatari(board, +color))

                    // minimize/maximize the number of libs of the target
                    + w[2] * S(n * color * sign(t))

                    // maximize the number of own liberties
                    + w[3] * S(sumlibs(board, +color))

                    // maximize the number of the opponent's blocks in atari
                    + w[4] * S(ninatari(board, -color))

                    // minimize the number of the opponent's liberties
                    + w[5] * S(-sumlibs(board, -color))

                    // if everything above is the same, pick a random move
                    + w[6] * S(random() - 0.5)
                ]);
            } finally {
                board.undo();
            }

            return true;
        }
    }
}
