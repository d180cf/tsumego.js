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
            test: test => test(x => new ValueContext(x))
        });
    }

    function assert(x: boolean, m = 'assertion failed', f = {}) {
        if (x) return;
        const e = new Error(m);
        for (const i in f)
            e[i] = f;
        throw e;
    }
    
    export class ValueContext<T> {
        constructor(private value: T) {
        }

        /** Checks strict === equality. */
        equal(y: T) {
            assert(this.value === y, 'lhs doesnt equal rhs', {
                lhs: this.value,
                rhs: y
            });
        }
    }
}
