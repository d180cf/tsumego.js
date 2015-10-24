module tsumego {
    const $vm = 0x20000000; // validity
    const $pm = 0x40000000; // has color
    const $wm = 0x80000000; // is white

    export type stone = number;

    export function stone(x: number, y: number, color: number, tag = 0) {
        return x | y << 4 | tag << 8 | $vm | (color && $pm) | color & $wm;
    }

    export module stone {
        export const color = (m: stone) => !(m & $pm) ? 0 : (m & $wm) ? -1 : +1;

        export const x = (m: stone) => m & 15;
        export const y = (m: stone) => m >> 4 & 15;

        export const coords = (m: stone) => [x(m), y(m)];

        export const toString = (m: stone) => stone.color(m) ? 'null' : (stone.color(m) > 0 ? '+' : '-') + stone.coords(m);
        export const fromSGF = (s: string) => stone(s2n(s[0]), s2n(s[1]), 0);

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
}
