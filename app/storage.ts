namespace testbench {
    const name = 'tsumego.js';

    interface Data {
        [path: string]: string; // SGF
    }

    class SVM {
        /** A callback that's invoked once an entry is removed. */
        removed = new Event<(path: string) => void>();

        /** A callback that's invoked once an entry is added. */
        added = new Event<(path: string, sgf: string) => void>();

        constructor(private storage: Storage) {

        }

        get data(): Data {
            return JSON.parse(this.storage.getItem(name)) || {};
        }

        set data(json: Data) {
            this.storage.setItem(name, JSON.stringify(json));
        }

        get(path: string) {
            return this.data[path];
        }

        set(path: string, sgf: string) {
            const json = this.data;
            const wasthere = !!json[path];
            json[path] = sgf || undefined;
            this.data = json;

            if (wasthere && !sgf)
                this.removed.fire(path);

            if (!wasthere && sgf)
                this.added.fire(path, sgf);
        }

        get filter() {
            return this.storage.getItem('filter') || '';
        }

        set filter(value: string) {
            this.storage.setItem('filter', value || '');
        }

        get dst() {
            return +this.storage.getItem('dst') || 0;
        }

        set dst(value: number) {
            this.storage.setItem('dst', value + '');
        }
    }

    export const ls = new SVM(localStorage);
    export const ss = new SVM(sessionStorage);
}
