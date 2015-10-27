module tsumego {
    const $cm = 0x20000000; // has coords
    const $pm = 0x40000000; // has color
    const $wm = 0x80000000; // is white

    /**
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |                   tag                   |h|c|w|
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     */
    export type stone = number;

    export function stone(x: number, y: number, color: number, tag = 0) {
        return (x === null || y === null ? 0 : x | y << 4 | $cm) | (tag & 0xFFFF) << 8 | (color && $pm) | color & $wm;
    }

    export module stone {
        export const tag = (m: stone) => m >> 8 & 0xFFFF;
        export const color = (m: stone) => !(m & $pm) ? 0 : (m & $wm) ? -1 : +1;

        export const x = (m: stone) => m & $cm ? m & 15 : null;
        export const y = (m: stone) => m & $cm ? m >> 4 & 15 : null;

        export const coords = (m: stone) => [x(m), y(m)];

        export const neighbors = (m: stone) => {
            const x = stone.x(m);
            const y = stone.y(m);
            const c = stone.color(m);

            return [
                x <= 0x0 ? 0 : stone(x - 1, y, c),
                x >= 0xF ? 0 : stone(x + 1, y, c),
                y <= 0x0 ? 0 : stone(x, y - 1, c),
                y >= 0xF ? 0 : stone(x, y + 1, c)];
        }
    }

    export module stone {
        const n2s = (n: number) => n === null ? '-' : String.fromCharCode(n + 0x61); // 0 -> `a`, 3 -> `d`
        const s2n = (s: string) => s == '-' ? null : s.charCodeAt(0) - 0x61; // `d` -> 43 `a` -> 0

        export function toString(m: stone) {
            const c = stone.color(m);
            const [x, y] = stone.coords(m);
            const s = n2s(x) + n2s(y);
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
