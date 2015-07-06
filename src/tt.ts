module tsumego {
    export interface HasheableNode {
        hash(): string;
    }

    interface Solution {
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
        move?: Coords;
    }

    const hash = (b: HasheableNode, c: Color) => (c > 0 ? 'X' : 'O') + ':' + b.hash();

    /** Transposition table. */
    export class TT {
        private _: { [hash: string]: Solution } = {};

        /**
         * @param n - The number of available ko treats.
         */
        get(b: HasheableNode, c: Color, n: number): Result {
            const h = hash(b, c);
            const s = this._[h];

            if (s) {
                if (n >= s.bmax)
                    return { color: +1, move: s.move, repd: infty };

                if (n <= s.wmin)
                    return { color: -1, move: s.move, repd: infty };
            }
        }

        /**
         * @param n - The number of ko treats that was needed to get the result.
         */
        set(b: HasheableNode, c: Color, r: Result, n: number) {
            const h = hash(b, c);
            const s = this._[h] || { wmin: -infty, bmax: +infty, move: r.move };

            if (r.color > 0 && n < s.bmax)
                s.bmax = n, s.move = r.move;

            if (r.color < 0 && n > s.wmin)
                s.wmin = n, s.move = r.move;

            this._[h] = s;
        }
    }
}
