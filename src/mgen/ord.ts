module tsumego.mgen {
    export class MvsOrd {
        /** Defines the order in which the solver considers moves. */
        sa = new SortedArray<stone, { r: number; p: number; q: number, u: number, v: number }>((a, b) =>
            b.r - a.r || // maximize the number of captured stones first
            a.u - b.u || // minimize the number of own blocks in atari
            b.p - a.p || // maximize the number of own liberties
            b.v - a.v || // maximize the number of the opponent's blocks in atari
            a.q - b.q || // minimize the number of the opponent's liberties
            random() - 0.5);

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
            if (!r) return false;

            try {
                const t = board.get(this.target);

                // there is no point to play self atari moves
                if (t * color > 0 && block.libs(t) < 2)
                    return false;

                // it's surprising, that with this dumb moves ordering
                // and with the cached tt results, the 1-st move appears
                // to be correct in 98% of cases
                this.sa.insert(s, {
                    r: r,
                    p: sumlibs(board, +color),
                    q: sumlibs(board, -color),
                    u: ninatari(board, +color),
                    v: ninatari(board, -color),
                });
            } finally {
                board.undo();
            }

            return true;
        }
    }
}
