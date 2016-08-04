module tsumego {
    // The expected number of collisions in a hash table is
    //
    //  E = n - m + m*(1 - 1/m)**n) ~ n**2/2m
    //
    // where
    //
    //  n = the number of entires; usually ~1e6 in a typical tsumego
    //  m = the size of the hash table; usually 2**32 or 2**64
    //
    // This gives 125 collisions if n = 2**20 and m = 2**32.
    // If a 64 bit key is used, then a collision will appear
    // only once in 2**25 tsumegos. 53 bits give one collision
    // per 2**14 tsumegos, correspondingly.
    export class HashMap<T extends number> {
        private data = []; // 16 x 2**30 x 2**30

        constructor() {
            // this is a bit faster than a plain [] or {},
            // probably because negative keys are stringified
            for (let i = 0; i < 16; i++)
                this.data[i] = [];
        }

        get(key_hi: number, key_lo: number): T {
            const a = key_hi & 3 | key_lo << 2 & 12;
            const b = key_hi >>> 2;
            const c = key_lo >>> 2;

            const t = this.data[a][b];

            // (t && t[c] || 0) would be much slower
            if (!t) return <any>0;
            const value = t[c];
            if (!value) return <any>0;
            return value;
        }

        set(key_hi: number, key_lo: number, value: T) {
            const a = key_hi & 3 | key_lo << 2 & 12;
            const b = key_hi >>> 2;
            const c = key_lo >>> 2;

            const q = this.data[a];

            if (!q[b])
                q[b] = [];

            q[b][c] = value;
        }
    }
}
