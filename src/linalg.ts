/// <reference path="rand.ts" />

module tsumego.linalg {
    'use strict';

    export interface vector {
        [i: number]: number;
        length: number;
        map(f: (x: number) => number): vector;
    }

    export interface matrix {
        [row: number]: vector;
        length: number;
    }

    const from = <T>(n: number, f: (i: number) => T) => {
        const a: T[] = new Array(n);

        for (let i = 0; i < n; i++)
            a[i] = f(i);

        return a;
    };

    export module vector {
        export const zero = (n: number): vector =>
            from(n, () => 0);

        export const make = (n: number, f: (i: number) => number): vector =>
            from(n, f);

        export const dot = (u: vector, v: vector) => {
            let s = 0;

            for (let i = 0; i < u.length; i++)
                s += u[i] * v[i];

            return s;
        };

        /** m[i][j] = u[i] * v[j] */
        export const dyad = (u: vector, v: vector): matrix =>
            from(u.length, i =>
                from(v.length, j => u[i] * v[j]));

        /** w[i] = u[i] * v[i] */
        export const dot2 = (u: vector, v: vector): vector =>
            from(u.length, i => u[i] * v[i]);

        /** u + k * v */
        export const sum = (u: vector, v: vector, k = 1): vector =>
            from(u.length, i => u[i] + k * v[i]);
    }

    export module matrix {
        export const zero = (rows: number, cols: number): matrix =>
            from(rows, () => vector.zero(cols));

        export const make = (rows: number, cols: number, f: (r: number, c: number) => number): matrix =>
            from(rows, r =>
                vector.make(cols, c => f(r, c)));

        /** m * v */
        export const mulv = (m: matrix, v: vector): vector =>
            from(m.length, i => vector.dot(m[i], v));

        /** a + k * b */
        export const sum = (a: matrix, b: matrix, k = 1): matrix =>
            from(a.length, i => vector.sum(a[i], b[i], k));

        export const transpose = (m: matrix): matrix =>
            from(m[0].length, i =>
                from(m.length, j => m[j][i]));
    }
}
