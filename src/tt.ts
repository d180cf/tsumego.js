module tsumego {
    export interface HasheableNode {
        hash(): string;
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
