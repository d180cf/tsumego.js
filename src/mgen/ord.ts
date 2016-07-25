module tsumego.mgen {
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

            const s = stone(x, y, color);
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
                    r,

                    // minimize the number of own blocks in atari
                    -ninatari(board, +color),

                    // minimize/maximize the number of libs of the target
                    n * color * sign(t),

                    // maximize the number of own liberties
                    sumlibs(board, +color),

                    // maximize the number of the opponent's blocks in atari
                    ninatari(board, -color),

                    // minimize the number of the opponent's liberties
                    -sumlibs(board, -color),

                    // if everything above is the same, pick a random move
                    random() - 0.5,
                ]);
            } finally {
                board.undo();
            }

            return true;
        }
    }
}
