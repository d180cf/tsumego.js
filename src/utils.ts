/// <reference path="types.ts" />

function c2s(c: Color): string {
    return c > 0 ? 'X' : 'O';
}

function parse(si: string): XYIndex {
    return {
        x: si.charCodeAt(0) - 65,
        y: +/\d+/.exec(si)[0] - 1
    };
}

const x2s = (x: number) => String.fromCharCode(0x61 + x);
const y2s = (y: number) => x2s(y);
const xy2s = (xy: XYIndex) => x2s(xy.x) + y2s(xy.y);

/** 0 -> `a`, 3 -> `d` */
const n2s = (n: number) => String.fromCharCode(n + 0x61);

/** `d` -> 43 `a` -> 0 */
const s2n = (s: string, i: number = 0) => s.charCodeAt(i) - 0x61;

/** `cd` -> { x: 2, y: 3 } */
const f2xy = (s: string) => <XYIndex>{ x: s2n(s, 0), y: s2n(s, 1) };

/** { x: 2, y: 3 } -> `cd` */
const xy2f = (xy: XYIndex) => n2s(xy.x) + n2s(xy.y);

/** -1, { x: 2, y: 3 } -> `W[cd]` */
const xyc2f = (c: Color, xy: XYIndex) => (c > 0 ? 'B' : 'W') + '[' + xy2f(xy) + ']';

function min(a: number, b: number): number {
    return a < b ? a : b;
}

function max(a: number, b: number): number {
    return a > b ? a : b;
}

function abs(a: number): number {
    return a < 0 ? -a : a;
}

function toString36(n: uint): string {
    var s = '', b = 'a'.charCodeAt(0), d;

    do {
        d = n % 36;
        n = (n - d) / 36;
        s = (d < 10 ? d : String.fromCharCode(d - 10 + b)) + s;
    } while (n > 0);

    return s;
}

function isWin(result: number, color: number): boolean {
    return color > 0 ? result > 0 : result < 0;
}
