module tsumego {
    interface HashT<Move> {
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

            /**
             * The best move. Obviously, it's absent if there is no way to win.
             */
            move: Move;
        }
    }

    /** Transposition table. */
    export class TT<Move> {
        size = 0;

        /** b[h] = solution for h when B plays first */
        private b: HashT<Move> = {};
        /** w[h] = solution for h when W plays first */
        private w: HashT<Move> = {};

        get(hash: number, color: number, nkt: number) {
            const t = color > 0 ? this.b : this.w
            const s = t[hash];

            if (!s)
                return null;

            if (nkt >= s.bmax)
                return new Result<Move>(+1, s.move);

            if (nkt <= s.wmin)
                return new Result<Move>(-1, s.move);
        }

        set(hash: number, color: number, r: Result<Move>, nkt: number) {
            const t = color > 0 ? this.b : this.w
            const s = t[hash] || (this.size++, { wmin: -infty, bmax: infty, move: r.move });

            if (r.color > 0 && nkt < s.bmax)
                s.bmax = nkt, s.move = r.move;

            if (r.color < 0 && nkt > s.wmin)
                s.wmin = nkt, s.move = r.move;

            t[hash] = s;
        }
    }
}
