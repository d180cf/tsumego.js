module tsumego {
    export class NodeHashMap<T> {
        private data = [
            new HashMap<T>(), // b plays first
            new HashMap<T>(), // w plays first
        ];

        get(color: color, hash_b: number, hash_w: number): T {
            return this.data[color > 0 ? 0 : 1].get(hash_b, hash_w);
        }

        set(color: color, hash_b: number, hash_w: number, value: T) {
            return this.data[color > 0 ? 0 : 1].set(hash_b, hash_w, value);
        }
    }
}
