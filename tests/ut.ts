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
                console.log('running test...');
                test(expect);
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
            if (typeof y === 'object')
                expect(JSON.stringify(this.value)).equal(JSON.stringify(y))
            else
                assert(this.value === y, `${this.value} doesnt equal ${y}`);
        }
    }
}
