/** Generic LL(*) recursive descent parser. */
module tsumego.LL {
    interface ParsingFunction<T> {
        (str: string, pos: number): [T, number];
    }

    export class Pattern<T> {
        constructor(private _text: string, private _exec: ParsingFunction<T>) {

        }

        toString() {
            return this._text;
        }

        exec(str: string, pos: number): [T, number];
        exec(str: string): T;

        exec(str, pos?) {
            const r = this._exec.call(null, str, pos || 0);
            //console.log(this + '', str.slice(pos, pos + 10), r);
            if (typeof pos === 'number') return r;
            if (r && r[1] == str.length) return r[0];
            return null;
        }

        map<U>(fn: (value: T) => U): Pattern<U> {
            return new Pattern(':' + this, (str, pos) => {
                const r = this.exec(str, pos);
                return r ? [fn(r[0]), r[1]] : null;
            });
        }

        take(i: number) {
            return this.map(r => r[i]);
        }

        slice(from: number, to?: number) {
            return this.map(r => (<any>r).slice(from, to));
        }

        /** [["A", 1], ["B", 2]] -> { A: 1, B: 2 } */
        fold<U>(keyName: number, valName: number, merge = (a: U, b: U) => b) {
            return this.map((r: any) => {
                const m: { [key: string]: U } = {};

                for (const p of r)
                    m[p[keyName]] = merge(m[p[keyName]], p[valName]);

                return m;
            });
        }

        rep(min = 0) {
            return new Pattern(min + '*' + this, (str, pos) => {
                const res: T[] = [];
                let r: [T, number];

                while (r = this.exec(str, pos)) {
                    res.push(r[0]);
                    pos = r[1];
                }

                return res.length >= min ? [res, pos] : null;
            });
        }
    }

    export function rgx(r: RegExp) {
        return new Pattern(r + '', (str, pos) => {
            const m = r.exec(str.slice(pos));
            return m && m.index == 0 ? [m[0], pos + m[0].length] : null;
        });
    }

    export function txt(s: string) {
        return new Pattern('"' + s + '"', (str, pos) => {
            return str.slice(pos, pos + s.length) == s ? [s, pos + s.length] : null;
        });
    }

    export function seq(...ps: Pattern<any>[]) {
        return new Pattern('(' + ps.join(' ') + ')', (str, pos) => {
            const res = [];

            for (const p of ps) {
                const r = p.exec(str, pos);
                if (!r) return null;
                res.push(r[0]);
                pos = r[1];
            }

            return [res, pos];
        });
    }
}
