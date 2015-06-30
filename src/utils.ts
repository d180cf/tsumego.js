export function c2s(c: Color): string {
    return c > 0 ? 'X' : 'O';
}

export function parse(si: string): XYIndex {
    return {
        x: si.charCodeAt(0) - 65,
        y: +/\d+/.exec(si)[0] - 1
    };
}

export function xts(x: XIndex): string {
    return String.fromCharCode(65 + x);
}

export function yts(y: YIndex): string {
    return y + 1 + '';
}

export function xy2s(xy: XYIndex, s?: Color): string {
    var ss = s > 0 ? _y('X') : s < 0 ? _r('O') : '';
    var cc = xy ? xts(xy.x) + yts(xy.y) : '--';
    return cc;
}

export function min(a: number, b: number): number {
    return a < b ? a : b;
}

export function max(a: number, b: number): number {
    return a > b ? a : b;
}

export function abs(a: number): number {
    return a < 0 ? -a : a;
}

export function _w(s: string): string {
    return '\x1b[37;1m' + s + '\x1b[0m';
}

export function _r(s: string): string {
    return '\x1b[31;1m' + s + '\x1b[0m';
}

export function _y(s: string): string {
    return '\x1b[33;1m' + s + '\x1b[0m';
}

export function _c(s: string): string {
    return '\x1b[36;1m' + s + '\x1b[0m';
}

export function toString36(n: uint): string {
    var s = '', b = 'a'.charCodeAt(0), d;

    do {
        d = n % 36;
        n = (n - d) / 36;
        s = (d < 10 ? d : String.fromCharCode(d - 10 + b)) + s;
    } while (n > 0);

    return s;
}

export function isWin(result: number, color: number): boolean {
    return color > 0 ? result > 0 : result < 0;
}
