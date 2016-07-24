namespace testbench {
    const name = 'tsumego.js';
    const storage = localStorage;

    interface Data {
        [path: string]: string; // SGF
    }

    export const ls = {
        /** A callback that's invoked once an entry is removed. */
        removed: <Array<(path: string) => void>>[],

        /** A callback that's invoked once an entry is added. */
        added: <Array<(path: string, sgf: string) => void>>[],

        get data(): Data {
            return JSON.parse(storage.getItem(name)) || {};
        },

        set data(json: Data) {
            storage.setItem(name, JSON.stringify(json));
        },

        set(path: string, sgf: string) {
            const json = ls.data;
            const wasthere = !!json[path];
            json[path] = sgf || undefined;
            ls.data = json;

            if (wasthere && !sgf)
                for (const fn of this.removed)
                    fn(path);

            if (!wasthere && sgf)
                for (const fn of this.added)
                    fn(path, sgf);
        }
    }
}
