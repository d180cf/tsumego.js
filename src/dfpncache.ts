namespace tsumego {    
    type DfpnEntry = [number, number, number]; // pn, dn, md

    const ehash = (board: number, color: number) => color > 0 ? board ^ +1 : board ^ -1;

    export class DfpnCache {
        private entries: { [hash: number]: DfpnEntry } = {};

        get(board: number, color: number, defaults: DfpnEntry) {
            const hash = ehash(board, color);
            const data = this.entries[hash] || defaults;

            return this.entries[hash] = data;
        }

        set(board: number, color: number, data: DfpnEntry) {
            const hash = ehash(board, color);

            this.entries[hash] = data;
        }
    }
}