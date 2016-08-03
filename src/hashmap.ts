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
    export class HashMap {
        private data = [];

        constructor() {
            // this is a bit faster than a plain [] or {},
            // probably because negative keys are stringified
            for (let i = 0; i < 16; i++)
                this.data[i] = [];
        }

        get(key: number): number {
            return this.data[key >>> 28][key & 0x0FFFFFFF] || 0;
        }

        set(key: number, val: number) {
            this.data[key >>> 28][key & 0x0FFFFFFF] = val;
        }
    }
}
