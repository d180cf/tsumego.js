/// <reference path="hashmap.ts" />

module tsumego.stat {
    export var ttread = 0;
    export var ttwrite = 0;
    export var ttnew = 0;
    export var ttnoops = 0;
    export var ttsuccess = 0;

    logv.push(() => `tt reads = ${(ttread / 1e6).toFixed(1)} M`);
    logv.push(() => `tt writes = ${(ttwrite / 1e6).toFixed(1)} M`);
    logv.push(() => `tt new entries = ${ttnew / ttwrite * 100 | 0} %`);
    logv.push(() => `tt noop writes = ${ttnoops / ttwrite * 100 | 0} %`);
    logv.push(() => `tt successfull reads = ${ttsuccess / ttread * 100 | 0} %`);
}

module tsumego {
    export class TT {
        size = 0;

        private data = new NodeHashMap<TT.Entry>();

        get(color: color, hash_b: number, hash_w: number, reqs?: { dmax: number, km: color }): TT.Entry {
            stat.ttread++;

            const entry = this.data.get(color, hash_b, hash_w);

            if (!entry)
                return null;

            // the caller needs a reliable result, not just a hint
            if (reqs) {
                // the result was found by a shallower search
                if (entry.dmax < reqs.dmax)
                    return null;

                // the entry represents an exact result, not just an upper/lower bound
                if (entry.type == 0) {
                    if (entry.value == +1) {
                        // the winning move was found when there were more ko treats:
                        // with fewer ko treats the result may change
                        if (color > 0 && reqs.km < entry.km_b || color < 0 && reqs.km > entry.km_w)
                            return null;
                    } else {
                        // it was a loss with this number of ko treats:
                        // increasing this number may discover a winning move
                        if (color > 0 && reqs.km > entry.km_b || color < 0 && reqs.km < entry.km_w)
                            return null;
                    }
                }
            }

            stat.ttsuccess++;

            return entry;
        }

        set(color: color, hash_b: number, hash_w: number, entry: TT.Entry) {
            stat.ttwrite++;

            const oldentry: TT.Entry = this.data.get(color, hash_b, hash_w);

            if (!oldentry) {
                this.size++;
                stat.ttnew++;
                this.data.set(color, hash_b, hash_w, entry);
                return;
            };

            // The idea here is to not override the winning move.
            // A typical case is the bent 4 shape: B wins if there are
            // no ko treats and loses if W has ko treats. If the first
            // solution is written first, then the second solution shouldn't
            // override the winning move.
            if (entry.dmax >= oldentry.dmax)
                this.data.set(color, hash_b, hash_w, entry);
        }
    }

    export module TT {
        export interface Entry {
            move: stone;
            dmax: number; // the result was found when searched up to this depth from current node
            value: number;
            type: number; // 0 = exact, -1 = lower bound, +1 = upper bound
            km_b: number; // B wins if km >= bmin
            km_w: number; // W wins if km <= wmax
        }

        export const empty: Entry = {
            move: 0,
            dmax: 0,
            value: 0,
            type: 0,
            km_b: 0,
            km_w: 0,
        }
    }
}
