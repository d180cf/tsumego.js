module tsumego {
    const kCoord = 0x20000000;
    const kColor = 0x40000000;
    const kWhite = 0x80000000;

    /**
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |              data             |         |h|c|w|
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     *  x - the x coord (valid only if h = 1)
     *  y - the y coord (valid only if h = 1)
     *  h - whether the stone has coordinates
     *  c - whether the stone has a color
     *  w - whether the stone is white (valid if c = 1)
     *
     * The 2-nd and the 3-rd bytes can be used to store arbitrary data.
     * The remaining 5 bits of the 4-th byte are reserved for future use.
     *
     */
    export type stone = number;

    export function stone(x: number, y: number, color: number) {
        return x | y << 4 | kCoord | (color && kColor) | color & kWhite;
    }

    export module stone {
        export const nocoords = (color: number) => kColor | color & kWhite;
        export const color = (m: stone) => (m & kColor) && (m & kWhite ? -1 : +1);
        export const hascoords = (m: stone) => !!(m & kCoord);

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
            const c = color(m);
            const [x, y] = coords(m);
            const s = !hascoords(m) ? null : n2s(x) + n2s(y);
            const t = c > 0 ? 'B' : 'W';

            return !c ? s : !s ? t : t + '[' + s + ']';
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
