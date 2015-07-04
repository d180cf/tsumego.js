/// <reference path="types.ts" />

const _x = (n: number, s: string) => s; // '\x1b[' + n + ';1m' + s + '\x1b[0m';

/** bring white font */
const _w = (s: string) => _x(37, s);

/** bring red font */
const _r = (s: string) => _x(31, s);

/** bring yellow font */
const _y = (s: string) => _x(33, s);

/** bring cyan font */
const _c = (s: string) => _x(36, s);

function c2s(c: Color): string {
    return c > 0 ? 'X' : 'O';
}

function parse(si: string): XYIndex {
    return {
        x: si.charCodeAt(0) - 65,
        y: +/\d+/.exec(si)[0] - 1
    };
}

function xts(x: XIndex): string {
    return String.fromCharCode(65 + x);
}

function yts(y: YIndex): string {
    return y + 1 + '';
}

const n2s = (n: number) => String.fromCharCode(n + 0x61);
const s2n = (s: string, i: number = 0) => s.charCodeAt(i) - 0x61;
const f2xy = (s: string) => <XYIndex>{ x: s2n(s, 0), y: s2n(s, 1) };

function xy2s(xy: XYIndex, s?: Color): string {
    var ss = s > 0 ? _y('X') : s < 0 ? _r('O') : '';
    var cc = xy ? xts(xy.x) + yts(xy.y) : '--';
    return cc;
}

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
