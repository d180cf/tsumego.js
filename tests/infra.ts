interface Error {
    stack: string;
}

module ut {
    export interface TestContext {
        /** Example: $(1 + 2).equal(3); */
        <T>(value: T): ValueContext<T>;
    }

    export interface GroupContext {
        test(test: ($: TestContext) => void): void;
    }    

    const fname = (f: Function) => /\/\/\/ (.+)[\r\n]/.exec(f + '')[1].trim();

    let indent = ' ';

    export function group(init: ($: GroupContext) => void) {
        const _indent = indent;
        console.log(indent, fname(init));
        indent += '  ';

        init({
            test: test => {
                const name = fname(test);

                try {
                    test(expect);
                    console.log(indent, name);
                } catch (err) {
                    console.log(indent, name, ':', 'FAILED');
                    while (err) {
                        console.error(indent, err && err.stack || err);
                        err = err.reason;
                    }
                }
            }
        });

        indent = _indent;
    }

    function assert(x: boolean, m = 'assertion failed', f = {}) {
        if (x) return;
        const e = new Error(m);
        for (const i in f)
            e[i] = f;
        if (/^#debug$/.test(location.hash))
            debugger;
        throw e;
    }

    function expect<T>(x: T) {
        return new ValueContext(x);
    }

    export class ValueContext<T> {
        constructor(private value: T) {

        }

        /** Checks strict === equality. */
        equal(y: T) {
            match(y)(this.value);
        }
    }

    function match(pattern) {
        if (typeof pattern === 'string')
            return match.text(pattern);

        if (typeof pattern === 'number' || pattern === null || pattern === undefined)
            return match.primitive(pattern);

        if (typeof pattern === 'object' && pattern.constructor === Object)
            return match.dictionary(pattern);

        if (pattern instanceof Array)
            return match.array(pattern);

        throw new Error(`Unrecognized pattern: ${pattern}.`);
    }

    module match {
        export function text(pattern: string) {
            return (value: string) => {
                if (value !== pattern) {
                    assert(false, 'The two strings do not match:'
                        + '\n lhs: ' + stringify(value)
                        + '\n lhs: ' + stringify(pattern)
                        + '\ndiff: ' + strdiff(value, pattern));
                }
            };
        }

        export function primitive<T extends number|void>(pattern: T) {
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
                        throw MatchError(`[${i}] has a wrong value`, err);
                    }
                }

                assert(pattern.length == value.length, `.length: ${value.length} > ${pattern.length}`);
            };
        }
    }

    function MatchError(message: string, reason: Error) {
        const err = new Error(message);
        err['reason'] = reason;
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

declare const require: Function;

try {
    require('source-map-support').install();
} catch (e) {
    console.log(e);
}
