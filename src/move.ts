module tsumego {
    const kCoord = 0x20000000;
    const kColor = 0x40000000;
    const kWhite = 0x80000000;
    const kTagdw = 0x00FFFF00;

    /**
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |             tag               |         |h|c|w|
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     *      x   - the x coord (valid only if h = 1)
     *      y   - the y coord (valid only if h = 1)
     *      tag - some context dependent data (the repd valuye in the solver)
     *      h   - whether the stone has coordinates
     *      c   - whether the stone has a color
     *      w   - whether the stone is white (valid if c = 1)
     */
    export type stone = number;

    export function stone(x: number, y: number, color: number) {
        return x | y << 4 | kCoord | (color && kColor) | color & kWhite;
    }

    export module stone {
        export const tag = (m: stone) => (m & kTagdw) >> 8;
        export const tagged = (color: number, tag: number) => tag << 8 & kTagdw | kColor | color & kWhite;
        export const color = (m: stone) => !(m & kColor) ? 0 : (m & kWhite) ? -1 : +1;
        export const hascoords = (m: stone) => m & kCoord;
        export const changetag = (m: stone, tag: number) => m & ~kTagdw | tag << 8 & kTagdw;

        export const x = (m: stone) => m & 15;
        export const y = (m: stone) => m >> 4 & 15;

        export const coords = (m: stone) => [x(m), y(m)];

        export const neighbors = (m: stone) => {
            const [x, y] = stone.coords(m);
            const c = stone.color(m);

            return [
                x <= 0x0 ? 0 : stone(x - 1, y, c),
                x >= 0xF ? 0 : stone(x + 1, y, c),
                y <= 0x0 ? 0 : stone(x, y - 1, c),
                y >= 0xF ? 0 : stone(x, y + 1, c)];
        }
    }

    export module stone {
        const n2s = (n: number) => String.fromCharCode(n + 0x61); // 0 -> `a`, 3 -> `d`
        const s2n = (s: string) => s.charCodeAt(0) - 0x61; // `d` -> 43 `a` -> 0

        export function toString(m: stone) {
            const c = stone.color(m);
            const [x, y] = stone.coords(m);
            const s = !stone.hascoords(m) ? null : n2s(x) + n2s(y);
            const t = c > 0 ? 'B' : 'W';

            return !c ? s : t + '[' + s + ']';
        }

        export function fromString(s: string) {
            if (!/^[BW]\[[a-z]{2}\]|[a-z]{2}$/.test(s))
                throw SyntaxError('Invalid move: ' + s);

            const c = { B: +1, W: -1 }[s[0]] || 0;
            if (c) s = s.slice(2);

            const x = s2n(s[0]);
            const y = s2n(s[1]);

            return stone(x, y, c);
        }
    }
}
