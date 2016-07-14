/// <reference path="i32ht.ts" />

module tsumego {
    /**
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |  b  |  w  |u|m|     level     |               |
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     * The first 2 bytes tell the outcome if black can play first:
     *
     *      b - if km >= b, then black wins; b = -3..+3
     *      w - if km <= w, then white wins; w = -3..+3
     *      m - if km >= b, m tells if black needs to play at (x, y) to win
     *      u - this bit isn't used at the moment
     *      l - the max level (lambda order) for which this solution applies
     *
     * where km = +1 means that W is the ko master, km = -1 means
     * that B is the ko master and km = 0 means neither B nor W has
     * external ko treats.
     *
     * Obviously, w < b, as otherwise the status would be ambiguous.
     * This implies that the zero entry is not valid.
     */
    type entry = number;

    function entry(x: number, y: number, b: number, w: number, m: boolean, level: number) {
        return x | y << 4 | (b & 7) << 8 | (w & 7) << 11 | (m ? 0x8000 : 0) | (level & 255) << 16;
    }

    module entry {
        export const x = (e: entry) => e & 15;
        export const y = (e: entry) => e >> 4 & 15;
        export const b = (e: entry) => (e >> 8 & 7) << 29 >> 29;
        export const w = (e: entry) => (e >> 11 & 7) << 29 >> 29;
        export const m = (e: entry) => !!(e & 0x8000);
        export const level = (e: entry) => e >> 16 & 255;
    }

    module entry {
        export const base = entry(0, 0, +3, -3, false, 0);
    }

    /** Transposition Table */
    export class TT {
        size = 0;
        move = new Int32HashTable; // node -> stone

        private data = [
            new Int32HashTable, // node -> entry, if b plays first
            null,
            new Int32HashTable, // node -> entry, if w plays first
        ];

        get(hash: number, color: number, km: number, level: number) {
            const e = this.data[color & 2].get(hash);

            if (!e || entry.level(e) < level)
                return 0;

            const winner =
                km >= entry.b(e) ? +1 : // enough ko treats for black
                    km <= entry.w(e) ? -1 : // enough ko treats for white
                        0; // not solved for this number of ko treats

            if (!winner) return 0;

            // the move must be dropped if the outcome is a loss
            const mm = winner * color > 0 && entry.m(e) ?
                stone(entry.x(e), entry.y(e), winner) :
                stone.nocoords(winner);

            return rlvl.set(mm, entry.level(e));
        }

        /** 
         * @param color Who plays first.
         * @param move The outcome. Must have a color and may have coordinates.
         * @param km Must be either-1, +1 or 0.
         * @prama level The max lambda order for which this solution works.
         */
        set(hash: number, color: number, move: stone, km: number, level: number) {
            const e = this.data[color & 2].get(hash) || ++this.size && entry.base;

            if (level < entry.level(e))
                return;

            // The idea here is to not override the winning move.
            // A typical case is the bent 4 shape: B wins if there are
            // no ko treats and loses if W has ko treats. If the first
            // solution is written first, then the second solution shouldn't
            // override the winning move.
            const [x, y, hc] = move * color > 0 ?
                [stone.x(move), stone.y(move), stone.hascoords(move)] :
                [entry.x(e), entry.y(e), entry.m(e)];

            const b = entry.b(e);
            const w = entry.w(e);

            const e2 = move > 0 && km < b ? entry(x, y, km, w, hc, level) :
                move < 0 && km > w ? entry(x, y, b, km, hc, level) :
                    e;

            this.data[color & 2].set(hash, e2);
        }
    }
}
