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
        private _size = 0;
        private _indx = [];
        private _next = [];
        private _keys = [];
        private _data = [];

        constructor(size: number) {
            this._indx.length = size * 2;
            this._next.length = size + 1;
            this._keys.length = size + 1;
            this._data.length = size + 1;
        }

        get(hi: number, lo: number): T {
            let hash = this._hash(hi, lo);
            let node = this._indx[hash] || 0;

            while (node > 0 && !this._test(node, hi, lo))
                node = this._next[node];

            return this._data[node];
        }

        set(hi: number, lo: number, value: T) {
            let hash = this._hash(hi, lo);
            let node = this._indx[hash] || 0, prev = 0;

            while (node > 0 && !this._test(node, hi, lo))
                node = this._next[prev = node];

            if (node > 0) {
                this._data[node] = value;
            } else {
                node = ++this._size;

                this._data[node] = value;
                this._keys[node] = [hi, lo];

                if (prev > 0)
                    this._next[prev] = node;
                else
                    this._indx[hash] = node;
            }
        }

        _hash(hi, lo) {
            let n = this._indx.length;
            let h = (hi ^ lo) % n;
            return h < 0 ? h + n : h;
        }

        _test(node, hi, lo) {
            let k = this._keys[node];
            return k[0] == hi && k[1] == lo;
        }
    }
}
