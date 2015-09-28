module tsumego.profile {
    'use strict';

    export const enabled = true;

    export const now = typeof performance === 'undefined' ?
        () => Date.now() :
        () => performance.now();

    export let started: number;

    export const counters: { [name: string]: number } = {};

    export function reset() {
        for (let name in counters)
            counters[name] = 0;
        started = now();
    }

    export function log() {
        const total = now() - started;
        console.log(`Total: ${(total / 1000).toFixed(2) }s`);
        for (let name in counters)
            console.log(`${name}: ${(counters[name] / total) * 100 | 0}%`);
    }

    export function _time<F extends Function>(name: string, fn: F): F {
        if (!enabled)
            return fn;

        counters[name] = 0;

        return <any>function (...args) {
            const started = now();

            try {
                return fn.apply(this, args);
            } finally {
                counters[name] += now() - started;
            }
        };
    }

    /** Measures time taken by all invocations of the method. */
    export function time(prototype: Object, method: string, d: TypedPropertyDescriptor<Function>) {
        d.value = _time(prototype.constructor.name + '::' + method, d.value);
    }
}
