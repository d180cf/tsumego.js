module ut {
    export interface TestContext {
        /** Example: $(1 + 2).equal(3); */
        <T>(value: T): ValueContext<T>;
    }

    export interface GroupContext {
        test(test: ($: TestContext) => void): void;
    }

    export function group(init: ($: GroupContext) => void) {
        init({
            test: test => {
                const name = /\/tests\/(.+)$/i.exec(Error()['stack'].split('\n')[3])[1];
                try {
                    test(expect);
                    console.log(name, 'passed');
                } catch (err) {
                    console.log(name, 'FAILED');
                    let indent = '';
                    while (err) {
                        indent = '  ' + indent;
                        console.log(indent + err.message);
                        err = err.reason;
                    }
                }
            }
        });
    }

    function assert(x: boolean, m = 'assertion failed', f = {}) {
        if (x) return;
        const e = new Error(m);
        for (const i in f)
            e[i] = f;
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
        if (typeof pattern === 'number' || typeof pattern === 'string' || pattern === null || pattern === undefined)
            return match.primitive(pattern);

        if (typeof pattern === 'object' && pattern.constructor === Object)
            return match.dictionary(pattern);

        if (pattern instanceof Array)
            return match.array(pattern);

        throw new Error(`Unrecognized pattern: ${pattern}.`);
    }

    module match {
        export function primitive<T extends string|number|void>(pattern: T) {
            return (value: T) => {
                assert(value === pattern, `${value} !== ${pattern}`);
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
}
