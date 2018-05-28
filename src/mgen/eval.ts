module tsumego.stat {
    export var nodes = 0;

    logv.push(() => `evaluated nodes = ${(nodes / 1e6).toFixed(1)} M`);
}

module tsumego {
    // this is something like the sigmoid function
    // to map values to [-1, +1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = (S / x)**2
    export const sigmoid = x => x / (1 + sign(x) * x);

    /**
     * Evaluates chances to win for the current player.
     *
     * Returns a number in the [-1, +1] range:
     * +1 = the current player surely wins,
     * -1 = the current player surely loses.
     *
     */
    export function evaluate(board: Board, target: stone, values = new HashMap<number>(1e6)) {
        // evaluates the node = (board, color) where color
        // tells who is about to play on this board
        return function _eval(color: number) {
            const t = board.get(target);
            const n = block.libs(t);

            // if the target is in atari and it's the attacker's
            // turn to play, the target is surely captured
            if (!t || t * color < 0 && n < 2)
                return -sign(t) * color;

            const hash_b = board.hash_b ^ color;
            const hash_w = board.hash_w ^ color;

            // it's surprising, that with this dumb moves ordering
            // and with the cached tt results, the 1-st move appears
            // correct in 98 % cases
            const v = values.get(hash_b, hash_w) || ++stat.nodes &&

                // maximize the number of captured stones first
                + sigmoid(board.nstones(color) - board.nstones(-color))

                // atari as many blocks of the opponent as possible
                + 8 ** -1 * sigmoid(board.natari(-color))

                // maximize/minimize the number of libs of the target
                + 8 ** -2 * sigmoid(n * color * sign(t))

                // minimize the number of libs of all blocks of the opponent
                - 8 ** -3 * sigmoid(board.sumlibs(-color))

                // minimize the number of own blocks in atari
                - 8 ** -4 * sigmoid(board.natari(color))

                // maximize the number of own libs
                + 8 ** -5 * sigmoid(board.sumlibs(color));

            values.set(hash_b, hash_w, v);

            // abs(v) < 1 + 1/8 + 1/64 + ... = 8/7
            // v = �1 should indicate a sure loss/win
            return v / 2;
        }
    }
}
