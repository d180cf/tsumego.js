module tsumego.profile {
    export const enabled = true;

    export const now = typeof performance === 'undefined' ?
        () => Date.now() :
        () => performance.now();

    export let started: number;

    const timers: { [name: string]: number } = {};
    const counters: { [name: string]: number } = {};
    const distributions: { [name: string]: number[] } = {};

    export function reset() {
        for (let name in timers)
            timers[name] = 0;
        started = now();
    }

    export function log() {
        if (started >= 0) {
            const total = now() - started;
            console.log(`Total: ${(total / 1000).toFixed(2) }s`);
            for (let name in timers)
                console.log(`${name}: ${(timers[name] / total) * 100 | 0}%`);
        }

        if (Object.keys(counters).length > 0) {
            console.log('counters:');

            for (let name in counters)
                console.log(`  ${name}: ${counters[name]}`);
        }

        if (Object.keys(distributions).length > 0) {
            console.log('distributions:');

            for (let name in distributions) {
                const d = distributions[name];
                const n = d.length;

                let lb: number, rb: number, min: number, max: number, sum = 0;

                for (let i = 0; i < n; i++) {
                    if (d[i] === undefined)
                        continue;

                    rb = i;

                    if (lb === undefined)
                        lb = i;

                    if (min === undefined || d[i] < min)
                        min = d[i];

                    if (max === undefined || d[i] > max)
                        max = d[i];

                    sum += d[i];
                }

                console.log(`  ${name}:`);

                for (let i = lb; i <= rb; i++)
                    if (d[i] !== undefined)
                        console.log(`    ${i}: ${d[i]} = ${d[i] / sum * 100 | 0}%`);
            }
        }
    }

    export function _time<F extends Function>(name: string, fn: F): F {
        if (!enabled)
            return fn;

        timers[name] = 0;

        return <any>function (...args) {
            const started = now();

            try {
                return fn.apply(this, args);
            } finally {
                timers[name] += now() - started;
            }
        };
    }

    /** Measures time taken by all invocations of the method. */
    export function time(prototype: Object, method: string, d: TypedPropertyDescriptor<Function>) {
        d.value = _time(prototype.constructor.name + '::' + method, d.value);
    }

    export class Counter {
        constructor(private name: string) {
            counters[name] = 0;
        }

        inc(n = 1) {
            counters[this.name] += n;
        }
    }

    export class Distribution {
        private d: number[];

        constructor(name: string) {
            this.d = distributions[name] = [];
        }

        inc(value: number, n = 1) {
            this.d[value] = (this.d[value] | 0) + n;
        }
    }
}
