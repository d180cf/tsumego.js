namespace testbench {
    const name = 'tsumego.js';
    const storage = localStorage;

    interface Data {
        [path: string]: string; // SGF
    }

    export const ls = {
        get data(): Data {
            return JSON.parse(storage.getItem(name)) || {};
        },

        set data(json: Data) {
            storage.setItem(name, JSON.stringify(json));
        },

        set(path: string, sgf: string) {
            const json = ls.data;
            json[path] = sgf;
            ls.data = json;
        }
    }
}
