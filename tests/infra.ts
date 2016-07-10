declare const process;
declare const global;
declare const require: Function;

interface Error {
    stack: string;
    reason: Error;
}

interface String {
    red(): string;
    green(): string;
    yellow(): string;
    blue(): string;
    magenta(): string;
    cyan(): string;
    white(): string;

    /** Removes ANSI escape codes. */
    clean(): string;
}

namespace tests {
    export const isNode = typeof process === 'object';
}

// en.wikipedia.org/wiki/ANSI_escape_code#Colors
namespace tests {
    export const sign = (x: number) => x > 0 ? +1 : x < 0 ? -1 : 0;

    Object.assign(String.prototype, {
        red() {
            return isNode ? '\x1b[31;1m' + this + '\x1b[0m' : this;
        },

        green() {
            return isNode ? '\x1b[32;1m' + this + '\x1b[0m' : this;
        },

        yellow() {
            return isNode ? '\x1b[33;1m' + this + '\x1b[0m' : this;
        },

        blue() {
            return isNode ? '\x1b[34;1m' + this + '\x1b[0m' : this;
        },

        magenta() {
            return isNode ? '\x1b[35;1m' + this + '\x1b[0m' : this;
        },

        cyan() {
            return isNode ? '\x1b[36;1m' + this + '\x1b[0m' : this;
        },

        white() {
            return isNode ? '\x1b[37;1m' + this + '\x1b[0m' : this;
        },

        clean() {
            return this.replace(/\x1b\[(\d+;)*\d+m/gm, '');
        },
    });

    export function ErrorWithReason(message: string, reason: Error) {
        const error = Error(message);
        error.reason = reason;
        throw error;
    }
}

namespace tests {
    const vals = [];

    const args: string[] = isNode ?
        process.argv.slice(2) :
        location.search.slice(1).split('&');

    for (const a of args) {
        if (!a) continue;

        const i = a.indexOf('=');

        if (i < 0)
            vals.push(a);
        else
            vals[a.slice(0, i)] = a.slice(i + 1);
    }

    /**
     * node test qwerty foo=bar
     * /test?qwerty&foo=bar
     */
    export const argv: {
        [index: number]: string;
        unodes?: boolean;
        log?: string;
    } = vals;
}

namespace tests {
    const fs = require('fs');

    const path = argv.log || 'logs.json';

    export const log = {
        path: path,
        stream: fs.createWriteStream(path),
        write(data) {
            this.stream.write(JSON.stringify(data));
            this.stream.write(',\n');
        }
    };

    log.stream.write('[\n');
}

namespace tests.ut {
    export interface GroupContext {
        test(test: ($: typeof expect) => string | void, name?: string): void;
    }

    const fname = (f: Function) => /\/\/\/ (.+)[\r\n]/.exec(f + '')[1].trim();

    let indent = '';
    export let failed = false;

    declare const process;
    declare const location;

    const filter = argv[0];

    if (filter)
        console.warn('tests filtered by: ' + JSON.stringify(filter));

    const md5: (text: string) => string = require('md5');

    export function group(init: ($: GroupContext) => void, gname = fname(init)) {
        const _indent = indent;
        console.log(indent + gname.cyan());
        indent += '  ';

        init({
            test: (test, tname = fname(test)) => {
                tname = md5(tname).slice(0, 6) + ' ' + tname;

                if (filter && tname.indexOf(filter) < 0 && gname.indexOf(filter) < 0)
                    return;

                const logs = [];

                try {
                    const _console_log = console.log;

                    console.log = (...args) => {
                        logs.push(args.map(JSON.stringify));
                    };

                    const started = new Date;
                    let comment;

                    if (isNode)
                        process.title = tname + ' @ ' + started.toLocaleTimeString();

                    try {
                        comment = test(expect);
                    } finally {
                        console.log = _console_log;
                    }

                    const duration = (Date.now() - +started) / 1000;

                    const note = duration < 1 ? '' :
                        duration < 3 ? duration.toFixed(1).white() + 's' :
                            duration < 10 ? duration.toFixed(1).yellow() + 's' :
                                duration.toFixed(1).magenta() + 's';

                    console.log(indent + tname, note, comment || '');
                } catch (err) {
                    failed = true;
                    console.log(indent + tname.red());

                    for (const args of logs)
                        console.log.apply(console, args.map(JSON.parse));

                    while (err) {
                        console.log(err && err.stack || err);
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
        if (typeof location === 'object' && /^#debug$/.test(location.hash))
            debugger;
        throw e;
    }

    function expect<T>(x: T): ValueContext<T>;
    function expect<T>(test: (x: T) => boolean, message?: (x: T) => string): (value: T) => void;

    function expect(x, message?): any {
        return x instanceof Function ?
            value => assert(x(value), message && message(value)) :
            new ValueContext(x);
    }

    module expect {
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
                        + '\n lhs: ' + stringify(value)
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

try {
    require('source-map-support').install();

    if (!global.Symbol) {
        console.warn('loading Symbol polyfill');
        global.Symbol = require('es6-symbol');
    }

    try {
        new Function('function*f(){}');
    } catch (err) {
        console.warn('loading the regenerator runtime');
        global.regeneratorRuntime = require('../libs/regenerator-runtime');
    }
} catch (e) {
    console.warn(e);
}

const _dt0 = Date.now();

tsumego.rand.seed(_dt0 | 0);
console.log('rand seed:', _dt0 | 0);
