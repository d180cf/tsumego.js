/// <reference path="eval.ts" />

module tsumego.mgen {
    export class MvsOrd {
        /** Defines the order in which the solver considers moves. */
        private sa = new SortedArray<stone>();
        private eval: (color: number) => number;

        constructor(private board: Board, private target: stone, private safe?: (s: stone) => boolean) {
            this.eval = evaluate(board, target);
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

            const v = this.eval(-color);

            // v == -1 indicates a sure loss
            if (v > -1)
                this.sa.insert(s, [v]);

            board.undo();
            return true;
        }
    }
}
