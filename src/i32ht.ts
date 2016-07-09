module tsumego {
    /**
     * Using a plain {} or [] as a int32 -> int32 map
     * can be noticeably slower than a pair of arrays
     * where indexes are trimed to unsigned int31 numbers.
     */
    export class Int32HashTable {
        private data = [];

        constructor() {
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
