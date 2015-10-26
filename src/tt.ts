module tsumego {
    interface HashT {
        [hash: number]: {
            /** 
             * The number of ko treats that will be enough to let white win.
             * Negative values represent white's ko treats, while positive
             * represent black's ko treats. From time to time this number
             * can be increased, but never reduced because if white can win
             * with n ko treats, then it can also win with n - 1 ko treat
             * (remember that negative values represent white's ko treats).
             */
            wmin: number;

            /**
             * The number of ko treats that will be enough to let black win.
             * This number can be negative to tell that white has ko treats
             * while black has none. From time to time this number can be reduced
             * but never increased because if black can win with n ko treats,
             * then it can also win with n + 1 ko treats.
             */
            bmax: number;

            /** The best move. Obviously, it's absent if there is no way to win. */
            move: stone;

            /** Useful when debugging. */
            htag: any;
        }
    }

    /** Transposition table. */
    export class TT {
        size = 0;

        /** b[h] = solution for h when B plays first */
        private b: HashT = {};
        /** w[h] = solution for h when W plays first */
        private w: HashT = {};

        get(hash: number, color: number, nkt: number) {
            const t = color > 0 ? this.b : this.w
            const s = t[hash];

            if (!s)
                return null;

            // the move must be set to null if this is a loss

            if (nkt >= s.bmax) {
                const [x, y] = color > 0 ?
                    stone.coords(s.move) :
                    [null, null];

                return stone(x, y, +1);
            }

            if (nkt <= s.wmin) {
                const [x, y] = color < 0 ?
                    stone.coords(s.move) :
                    [null, null];

                return stone(x, y, -1);
            }
        }

        set(hash: number, move: stone, nkt: number, htag?) {
            const c = stone.color(move);
            const t = c > 0 ? this.b : this.w
            const s = t[hash] || (this.size++ , { wmin: -infty, bmax: infty, move: move, htag: htag });

            if (c > 0 && nkt < s.bmax)
                s.bmax = nkt, s.move = move;

            if (c < 0 && nkt > s.wmin)
                s.wmin = nkt, s.move = move;

            t[hash] = s;
        }

        *[Symbol.iterator]() {
            for (const h in this.b)
                yield { hash: +h, color: +1, status: this.b[h] };

            for (const h in this.w)
                yield { hash: +h, color: -1, status: this.w[h] };
        }
    }
}
