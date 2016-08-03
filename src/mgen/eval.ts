module tsumego {
    export var _n_nodes = 0;

    // this is something like the sigmoid function
    // to map values to [-1, +1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = (S / x)**2
    const sigmoid = x => x / (1 + sign(x) * x);

    /**
     * Returns a number in the [-1, +1] range.
     */
    export function evaluate(board: Board, target: stone) {
        target = stone.make(stone.x(target), stone.y(target), board.get(target)); // add color

        const values = new HashMap<number>();

        // evaluates the node = (board, color) where color
        // tells who is about to play on this board
        return function _eval(color: number) {
            const t = board.get(target);
            const n = block.libs(t);

            if (!t)
                return +1;

            if (t * color < 0 && n < 2)
                return -1;

            // it's surprising, that with this dumb moves ordering
            // and with the cached tt results, the 1-st move appears
            // correct in 98 % cases
            const v = values.get(board.hash ^ color) || ++_n_nodes &&

                // maximize the number of captured stones first
                + 1e-0 * sigmoid(board.nstones(-color) - board.nstones(+color))

                // minimize the number of own blocks in atari
                - 1e-1 * sigmoid(board.natari(-color))

                // minimize/maximize the number of libs of the target
                - 1e-2 * sigmoid(n * color * sign(t))

                // maximize the number of own liberties
                + 1e-3 * sigmoid(board.sumlibs(-color))

                // maximize the number of the opponent's blocks in atari
                + 1e-4 * sigmoid(board.natari(+color))

                // minimize the number of the opponent's liberties
                - 1e-5 * sigmoid(board.sumlibs(+color))

                // if everything above is the same, pick a random move
                + 1e-6 * sigmoid(random() - 0.5);

            values.set(board.hash ^ color, v);
            return v / 2; // abs(v) < 1 + 1/10
        }
    }
}
