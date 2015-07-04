/** Generic LL(*) parser. */
module SDP {
    export class Pattern<T> {
        constructor(private _text: string, private _exec: Function) {

        }

        toString() {
            return this._text;
        }

        exec(str: string, pos: number): [T, number];
        exec(str: string): T;

        exec(str, pos?) {
            const r = this._exec.call(null, str, pos || 0);
            if (typeof pos === 'number') return r;
            if (r && r[1] == str.length) return r[0];
            return null;
        }

        map<U>(fn: (value: T) => U): Pattern<U> {
            return $(this._text, (str, pos) => {
                const r = this.exec(str, pos);
                return r ? [fn(r[0]), r[1]] : null;
            });
        }
    }

    export function $<T>(exec: Pattern<T>): Pattern<T>;
    export function $<T>(text: string, exec: (str: string, pos: number) => [T, number]): Pattern<T>;
    export function $(regexp: RegExp): Pattern<string>;
    export function $(string: string): Pattern<string>;
    export function $(items: any[]): Pattern<any[]>;
    export function $(pattern: any, min: number): Pattern<any[]>;

    export function $(x, n?): Pattern<any> {
        if (x instanceof Pattern) return x;
        if (typeof n === 'function') return new Pattern(x, n);
        if (x instanceof RegExp) return rgx(x);
        if (typeof x === 'string') return txt(x);
        if (x instanceof Array) return seq(...x);
        if (typeof x === 'number') return rep(x, n);
    }

    function rgx(r: RegExp) {
        return $(r + '', (str, pos) => {
            const m = r.exec(str.slice(pos));
            return m && m.index == 0 ? [m[0], pos + m[0].length] : null;
        });
    }

    function txt(s: string) {
        return $('"' + s + '"', (str, pos) => {
            return str.slice(pos, pos + s.length) == s ? [s, pos + s.length] : null;
        });
    }

    function seq(...ps: any[]) {
        return $(ps.join(' '), (str, pos) => {
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

    function rep(p, min = 0) {
        return $(min + '*' + p, (str, pos) => {
            const res = [];
            let r: [any, number];

            while (r = $(p).exec(str, pos)) {
                res.push(r[0]);
                pos = r[1];
            }

            return res.length >= min ? [res, pos] : null;
        });
    }
}
