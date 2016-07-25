/// <reference path="sorted.ts" />

module tsumego {
    export const version = '0.1.0';

    export const min = (a, b: number) => a < b ? a : b;
    export const max = (a, b: number) => a > b ? a : b;
    export const abs = (a: number) => a < 0 ? -a : a;

    export const sign = (x: number) => x < 0 ? -1 : x > 0 ? +1 : 0;

    export const nesw = [[-1, 0], [+1, 0], [0, -1], [0, +1]];

    export function* region(root: stone, belongs: (target: stone, source: stone) => boolean, neighbors = stone.neighbors) {
        const body: stone[] = [];
        const edge = [root];

        while (edge.length > 0) {
            const xy = edge.pop();

            yield xy;
            body.push(xy);

            for (const nxy of neighbors(xy))
                if (belongs(nxy, xy) && body.indexOf(nxy) < 0 && edge.indexOf(nxy) < 0)
                    edge.push(nxy);
        }
    }

    export const b4 = (b0: number, b1: number, b2: number, b3: number) => b0 | b1 << 8 | b2 << 16 | b3 << 24;

    export const b0 = (b: number) => b & 255;
    export const b1 = (b: number) => b >> 8 & 255;
    export const b2 = (b: number) => b >> 16 & 255;
    export const b3 = (b: number) => b >> 24 & 255;

    export const b_ = (b: number) => [b0(b), b1(b), b2(b), b3(b)];

    export function sequence<T>(n: number, f: () => T) {
        const x: T[] = [];

        while (n-- > 0)
            x.push(f());

        return x;
    }

    export const hex = (x: number) => (0x100000000 + x).toString(16).slice(-8);
    export const rcl = (x: number, n: number) => x << n | x >>> (32 - n);

    export function memoized<T, R>(fn: (x: T) => R, hashArgs: (x: T) => number): typeof fn {
        const cache = {};

        return fn && function (x: T) {
            const h = hashArgs(x);
            return h in cache ? cache[h] : cache[h] = fn(x);
        };
    }

    /** e.g. @enumerable(false) */
    export function enumerable(isEnumerable: boolean) {
        return (p, m, d) => void (d.enumerable = isEnumerable);
    }

    export function assert(condition) {
        if (!condition)
            debugger;
    }

    export const n32b = (d: { [name: string]: { offset: number, length: number, signed?: boolean } }) => ({
        parse(x: number) {
            const r = {};

            for (let name in d) {
                const {offset, length, signed = false} = d[name];
                const value = x << 32 - offset - length >> 32 - length;
                r[name] = signed ? value : value & (1 << length) - 1;
            }

            return r;
        }
    });
}
