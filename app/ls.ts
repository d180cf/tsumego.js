namespace testbench {
    const name = 'tsumego.js';
    const storage = localStorage;

    interface Data {
        [path: string]: string; // SGF
    }

    class Storage {
        /** A callback that's invoked once an entry is removed. */
        removed = new Event<(path: string) => void>();

        /** A callback that's invoked once an entry is added. */
        added = new Event<(path: string, sgf: string) => void>();

        get data(): Data {
            return JSON.parse(storage.getItem(name)) || {};
        }

        set data(json: Data) {
            storage.setItem(name, JSON.stringify(json));
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
            return storage.getItem('filter') || '';
        }

        set filter(value: string) {
            storage.setItem('filter', value || '');
        }
    }

    export const ls = new Storage;
}
