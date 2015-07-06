/// <reference path="types.ts" />

const infty = 100500;

/** 0 -> `a`, 3 -> `d` */
const n2s = (n: number) => String.fromCharCode(n + 0x61);

/** `d` -> 43 `a` -> 0 */
const s2n = (s: string, i: number = 0) => s.charCodeAt(i) - 0x61;

const min = (a, b: number) => a < b ? a : b;
const max = (a, b: number) => a > b ? a : b;
const abs = (a: number) => a < 0 ? -a : a;
