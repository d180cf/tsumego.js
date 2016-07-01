module tsumego {
    export const version = '0.1.0';

    export const min = (a, b: number) => a < b ? a : b;
    export const max = (a, b: number) => a > b ? a : b;
    export const abs = (a: number) => a < 0 ? -a : a;

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

    export class SortedArray<T, U> {
        private items: T[];
        private flags: U[];

        /** 
         * The items will be sorted in such a way that
         * compare(flags[i], flags[i + 1]) <= 0 for every i:
         * To sort items in a specific order:
         *
         *      ascending:  (a, b) => a - b
         *      descending: (a, b) => b - a
         *
         * To sort first by one field in the ascneding order
         * and then by another field in the descending order:
         *
         *      (a, b) => 
         *          a[0] - b[0] ||
         *          a[1] - b[1];
         *
         * This is exactly how Array::sort works.
         */
        constructor(private compare: (lhs: U, rhs: U) => number) {

        }

        reset() {
            this.flags = [];
            this.items = [];

            return this.items;
        }

        /**
         * Inserts a new item in a "stable" way, i.e.
         * if items are taken from one array which is
         * sorted according to some criteria #A and inserted
         * into this array, not only the items will be
         * sorted here by the new criteria #B, but also items
         * for which #B doesn't define a specific order
         * (returns zero in other words), will be correctly
         * ordered according to #A. More strictly, for any i < j:
         *
         *      1. B(sa[i], sa[j]) <= 0
         *      2. if B(sa[i], sa[j]) = 0 then A(sa[i], sa[j]) <= 0
         *
         * This property allows to compose a few sorted arrays.
         */
        insert(item: T, flag: U) {
            const {items, flags, compare} = this;

            let i = items.length;

            while (i > 0 && compare(flags[i - 1], flag) > 0)
                i--;

            // using .push when i == n and .unshift when i == 0
            // won't make the solver run faster
            items.splice(i, 0, item);
            flags.splice(i, 0, flag);

            return i;
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
