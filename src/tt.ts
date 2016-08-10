/// <reference path="hashmap.ts" />

module tsumego.stat {
    export var ttread = 0;
    export var ttwrite = 0;
    export var ttmiss = 0;

    logv.push(() => `tt reads = ${ttread}`);
    logv.push(() => `tt misses = ${ttmiss} = ${ttmiss / ttread * 100 | 0} %`);
    logv.push(() => `tt writes = ${ttwrite} = ${ttwrite / ttread * 100 | 0} %`);
}

module tsumego {
    /**
     * 0               1               2
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |  b  |  w  |c|m|
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     *  b - if km >= b, then black wins; b = -3..+3
     *  w - if km <= w, then white wins; w = -3..+3
     *  m - if km >= b, m tells if black needs to play at (x, y) to win
     *  c - 1 if black wins, 0 if white wins
     *
     * where km = +1 means that B is the ko master, km = -1 means
     * that W is the ko master and km = 0 means neither B nor W has
     * external ko treats
     *
     * Obviously, w < b, as otherwise the status would be ambiguous.
     * This implies that the zero entry is not valid.
     */
    enum entry { }

    module entry {
        export function make(x: number, y: number, b: number, w: number, m: boolean, c: number): entry {
            return x | y << 4 | (b & 7) << 8 | (w & 7) << 11 | (m ? 0x8000 : 0) | (c > 0 ? 0x4000 : 0);
        }
    }

    module entry {
        export const x = (e: entry) => e & 15;
        export const y = (e: entry) => e >> 4 & 15;
        export const b = (e: entry) => (e >> 8 & 7) << 29 >> 29;
        export const w = (e: entry) => (e >> 11 & 7) << 29 >> 29;
        export const m = (e: entry) => !!(e & 0x8000);
        export const c = (e: entry) => e & 0x4000 ? +1 : -1;

        export const base = entry.make(0, 0, +3, -3, false, 0);
    }

    /** 
     * The transposition table stores all found solutions:
     * unconditional, i.e. those that don't depend on the
     * path to the node, with a specific km (+1, 0, -1) and
     * conditional with null km.
     */
    export class TT {
        size = 0;

        private data = [
            new HashMap<entry>(), // node -> entry, if b plays first
            null,
            new HashMap<entry>(), // node -> entry, if w plays first
        ];

        get(hash_0: number, hash_1: number, color: number, km: number) {
            const t = this.data[color & 2];
            const e = t.get(hash_0, hash_1);

            stat.ttread++;

            if (!e) return 0;

            stat.ttmiss++;

            let winner: color;

            if (km === null)
                winner = entry.c(e);
            else if (km >= entry.b(e))
                winner = +1; // enough ko treats for black
            else if (km <= entry.w(e))
                winner = -1; // enough ko treats for white
            else
                return 0; // not solved for this km

            // the move must be dropped if the outcome is a loss
            return winner * color > 0 && entry.m(e) ?
                stone.make(entry.x(e), entry.y(e), winner) :
                stone.nocoords(winner);
        }

        set(hash_0: number, hash_1: number, color: number, move: stone, km: number) {
            const t = this.data[color & 2];
            const e = t.get(hash_0, hash_1) || (++this.size, entry.base);

            stat.ttwrite++;

            // The idea here is to not override the winning move.
            // A typical case is the bent 4 shape: B wins if there are
            // no ko treats and loses if W has ko treats. If the first
            // solution is written first, then the second solution shouldn't
            // override the winning move.
            let x: number, y: number, c: boolean;

            if (move * color > 0) {
                x = stone.x(move);
                y = stone.y(move);
                c = stone.hascoords(move);
            } else {
                x = entry.x(e);
                y = entry.y(e);
                c = entry.m(e);
            }

            const b = entry.b(e);
            const w = entry.w(e);

            if (km === null) {
                if (b == +3 && w == -3) // checks that the entry was empty
                    t.set(hash_0, hash_1, entry.make(x, y, b, w, c, move));
            } else if (move > 0 && km < b) {
                t.set(hash_0, hash_1, entry.make(x, y, km, w, c, move));
            } else if (move < 0 && km > w) {
                t.set(hash_0, hash_1, entry.make(x, y, b, km, c, move));
            }
        }
    }
}
