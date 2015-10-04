/// <reference path="types.ts" />

module tsumego {
    export const infty = 777;

    /** 0 -> `a`, 3 -> `d` */
    export const n2s = (n: number) => String.fromCharCode(n + 0x61);

    /** (2, 5) -> 'ce' */
    export const xy2s = (xy: stone) => Number.isFinite(xy) ? n2s(stone.x(xy)) + n2s(stone.y(xy)) : null;

    /** `d` -> 43 `a` -> 0 */
    export const s2n = (s: string, i: number = 0) => s.charCodeAt(i) - 0x61;

    /** 'ce' -> (2, 5) */
    export const s2xy = (s: string) => stone(s2n(s.charAt(0)), s2n(s.charAt(1)));

    export const min = (a, b: number) => a < b ? a : b;
    export const max = (a, b: number) => a > b ? a : b;
    export const abs = (a: number) => a < 0 ? -a : a;

    /** Simulates yield* which can't be called in a regular function.
        The point is to get the value that a generator returns at the end. */
    export function result<T>(g: IterableIterator<T>) {
        let r = g.next();
        while (!r.done)
            r = g.next();
        return r.value;
    }

    export const nesw = [[-1, 0], [+1, 0], [0, -1], [0, +1]];

    export function* region(root: stone, belongs: (target: stone, source: stone) => boolean) {
        const body: stone[] = [];
        const edge = [root];

        while (edge.length > 0) {
            const xy = edge.pop();

            yield xy;
            body.push(xy);

            for (const nxy of stone.nb.all(xy))
                if (belongs(nxy, xy) && body.indexOf(nxy) < 0 && edge.indexOf(nxy) < 0)
                    edge.push(nxy);
        }
    }

    export class SortedArray<T, U> {
        private items: T[];
        private flags: U[];

        get length() {
            return this.items.length;
        }

        /** 
         * The order function tells whether it's ok to
         * place lhs before rhs in the sorted array. 
         * The order function must satisfy the following
         * condition: order(a, b) || order(b, a); in other
         * words it must allow either (a, b) placement or
         * (b, a) placement.
         */
        constructor(private order: (lhs: U, rhs: U) => boolean) {

        }

        reset() {
            this.flags = [];
            this.items = [];

            return this.items;
        }

        insert(item: T, flag: U) {
            const {items, flags, order} = this;

            let i = items.length;

            while (i > 0 && !order(flags[i - 1], flag))
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
}
