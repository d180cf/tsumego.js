module tests {
    function assert(x: boolean, m = 'assertion failed', f = {}) {
        if (x) return;
        const e = new Error(m);
        for (const i in f)
            e[i] = f;
        if (typeof location === 'object' && /^#debug$/.test(location.hash))
            debugger;
        throw e;
    }

    export function expect<T>(x: T): ValueContext<T>;
    export function expect<T>(test: (x: T) => boolean, message?: (x: T) => string): (value: T) => void;

    export function expect(x, message?): any {
        return x instanceof Function ?
            value => assert(x(value), message && message(value)) :
            new ValueContext(x);
    }

    export module expect {
        export function error(fn) {
            try {
                fn();
            } catch (e) {
                return e;
            }

            throw Error('No error was thrown.');
        }

        export const ge = (min: number) => expect(x => x >= min, x => `${x} < ${min}`);
        export const le = (max: number) => expect(x => x <= max, x => `${x} > ${max}`);
    }

    export class ValueContext<T> {
        constructor(private value: T) {

        }

        equal(y: T) {
            match(y)(this.value);
        }

        matches(pattern) {
            match(pattern)(this.value);
        }

        belong(y: T[]) {
            if (y.indexOf(this.value) < 0)
                throw Error(`${JSON.stringify(this.value)} cannot be found in ${JSON.stringify(y)}`);
        }
    }

    function match(pattern) {
        if (typeof pattern === 'string')
            return match.text(pattern);

        if (typeof pattern === 'number' || pattern === null || pattern === undefined || pattern === false || pattern === true)
            return match.primitive(pattern);

        if (typeof pattern === 'object' && pattern.constructor === Object)
            return match.dictionary(pattern);

        if (pattern instanceof Array)
            return match.array(pattern);

        if (pattern instanceof Function)
            return pattern;

        throw new Error(`Unrecognized pattern: ${pattern}.`);
    }

    module match {
        export function text(pattern: string) {
            return (value: string) => {
                if (value !== pattern) {
                    assert(false, 'The two strings do not match:'
                        + '\n rhs: ' + stringify(value)
                        + '\n lhs: ' + stringify(pattern)
                        + '\ndiff: ' + strdiff(value, pattern));
                }
            };
        }

        export function primitive<T extends number | void>(pattern: T) {
            return (value: T) => {
                if (value !== pattern)
                    assert(false, `${value} !== ${pattern}`);
            };
        }

        export function dictionary<T extends {}>(pattern: T) {
            return (value: T) => {
                for (const key in pattern) {
                    try {
                        match(pattern[key])(value[key]);
                    } catch (err) {
                        throw MatchError(`[${key}] has a wrong value`, err);
                    }
                }

                for (const key in value) {
                    if (!(key in pattern))
                        throw Error(`[${key}] should be absent`);
                }
            };
        }

        export function array<T>(pattern: any[]) {
            return (value: T[]) => {
                for (let i = 0; i < pattern.length; i++) {
                    try {
                        match(pattern[i])(value[i]);
                    } catch (err) {
                        throw MatchError(`[${i}] has a wrong value: ${JSON.stringify(pattern)} != ${JSON.stringify(value)}`, err);
                    }
                }

                assert(pattern.length == value.length, `.length: ${value.length} > ${pattern.length}`);
            };
        }
    }

    function MatchError(message: string, reason: Error) {
        const err = new Error(message);
        err.reason = reason;
        return err;
    }

    function stringify(value) {
        return typeof value === 'string' ? stringifyString(value) :
            value + '';
    }

    function stringifyString(string: string) {
        const escaped = string
            .replace(/"/gm, '\\"')
            .replace(/\n/gm, '\\n');

        return '"' + escaped + '"';
    }

    function strdiff(lhs: string, rhs: string) {
        for (let i = 0; i < lhs.length || i < rhs.length; i++)
            if (lhs.charAt(i) !== rhs.charAt(i))
                return '.slice(' + i + ') = '
                    + stringify(truncate(lhs, i, i + 5))
                    + ' vs '
                    + stringify(truncate(rhs, i, i + 5));

        return '(identical)';
    }

    function truncate(s: string, i, j: number) {
        const w = s.slice(i, j);
        return j < s.length ? w : w + '...';
    }
}
