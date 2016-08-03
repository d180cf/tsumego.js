module tsumego {
    // this is something like the sigmoid function
    // to map values to [-1, +1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = (S / x)**2
    const S = (x: number) => x / (1 + sign(x) * x);

    export function evaluate(board: Board, target: stone) {
        return function _eval(color: number) {
            const t = board.get(this.target);
            const n = block.libs(t);

            // there is no point to play self atari moves
            if (t * color > 0 && n < 2)
                return -1;

            // it's surprising, that with this dumb moves ordering
            // and with the cached tt results, the 1-st move appears
            // correct in 98 % cases
            const v =
                // maximize the number of captured stones first
                + 1e-0 * S(board.nstones(+color) - board.nstones(-color))

                // minimize the number of own blocks in atari
                - 1e-1 * S(board.natari(+color))

                // minimize/maximize the number of libs of the target
                + 1e-2 * S(n * color * sign(t))

                // maximize the number of own liberties
                + 1e-3 * S(board.sumlibs(+color))

                // maximize the number of the opponent's blocks in atari
                + 1e-4 * S(board.natari(-color))

                // minimize the number of the opponent's liberties
                - 1e-5 * S(board.sumlibs(-color))

                // if everything above is the same, pick a random move
                + 1e-6 * S(random() - 0.5);

            return v;
        }
    }
}
