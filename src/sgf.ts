module SGF {
    /** Tag AW[bb][cb][cc] gets decomposed into:
     *
     *      [name] = AW
     *      [0] = bb
     *      [1] = cb
     *      [2] = cc
     *
     */
    interface Tag {
        name: string;
        [valueIndex: number]: string;
    }

    /** 
     * Node FF[4](;B[aa];W[bb])(B[ab]W[cb]) gets decomposed into:
     *
     *      tags[0] = FF[4]
     *      [0] = B[aa];W[bb]
     *      [0] = B[ab]W[cb]
     */
    interface Node {
        tags: Tag[];
        [variationIndex: number]: Node;
    }

    interface E<T> {
        (str: string, pos: number): [T, number];
    }

    class Pattern<T> {
        constructor(public exec: E<T>) {

        }

        map<U>(fn: (value: T) => U) {
            return new Pattern((str, pos) => {
                const r = this.exec(str, pos);
                return r ? [fn(r[0]), r[1]] : null;
            });
        }
    }

    function $<T>(exec: Pattern<T>): Pattern<T>;
    function $<T>(exec: E<T>): Pattern<T>;
    function $(regexp: RegExp): Pattern<string>;
    function $(string: string): Pattern<string>;
    function $(items: any[]): Pattern<any[]>;
    function $(pattern: any, min: number): Pattern<any[]>;

    function $(x, n?): Pattern<any> {
        if (x instanceof Pattern) return x;
        if (typeof x === 'function') return new Pattern(x);
        if (x instanceof RegExp) return rgx(x);
        if (typeof x === 'string') return txt(x);
        if (x instanceof Array) return seq(...x);
        if (typeof x === 'number') return rep(x, n);
    }

    function rgx(r: RegExp) {
        return $((str, pos) => {
            const m = r.exec(str.slice(pos));
            return m && m.index == 0 ? [m[0], pos + m[0].length] : null;
        });
    }

    function txt(s: string) {
        return $((str, pos) => {
            return str.slice(pos, pos + s.length) == s ? [s, pos + s.length] : null;
        });
    }

    function seq(...ps: any[]) {
        return $((str, pos) => {
            const res = [];

            for (const p of ps) {
                const r = $(p).exec(str, pos);
                if (!r) return null;
                res.push(r[0]);
                pos = r[1];
            }

            return [res, pos];
        });
    }

    function rep(p, min) {
        return $((str, pos) => {
            const res = [];
            let r: [any, number];

            while (r = $(p).exec(str, pos)) {
                res.push(r[0]);
                pos = r[1];
            }

            return res.length >= min ? [res, pos] : null;
        });
    }

    function parse(source: string): Node {
        const val = $(/\[.*?\]/).map(s => s.slice(+1, -1));

        const tag = $([/\s*;/, /\w+/, $(val, 0)]).map(r => {
            const t: Tag = r[3];
            t.name = r[2];
            return t;
        });

        const sgf = $([/\s*\(/, $(tag, 0), $((s, i) => sgf.exec(s, i), 0), ')']).map(r => {
            const n: Node = r[3];
            n.tags = r[2];
            return n;
        });

        return sgf.exec(source, 0)[0];
    }
}