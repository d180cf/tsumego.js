module tsumego {
    const $vm = 0x40000000; // validity mask
    const $cm = 0x80000000; // color mask

    /**
     * bits 0..3 - the X coord
     * bits 5..7 - the Y coord
     * bit 30 - validity
     * bit 31 - color (1 = white, 0 = black)
     */
    export type stone = number;

    export function stone(x: number, y: number, color = 0) {
        return x | y << 4 | color & $cm | $vm;
    }

    export module stone {
        export const color = (m: stone) => m & $vm ? m : 0;

        export const x = (m: stone) => m & 15;
        export const y = (m: stone) => m >> 4 & 15;

        export const coords = (m: stone) => [x(m), y(m)];

        export const toString = (m: stone) => !m ? 'null' : (stone.color(m) > 0 ? '+' : '-') + stone.coords(m);
        export const fromSGF = (s: string) => stone(s2n(s[0]), s2n(s[1]));

        export module nb {
            export const l = (m: stone) => x(m) > 0x0 ? stone(x(m) - 1, y(m)) : 0;
            export const r = (m: stone) => x(m) < 0xF ? stone(x(m) + 1, y(m)) : 0;
            export const t = (m: stone) => y(m) > 0x0 ? stone(x(m), y(m) - 1) : 0;
            export const b = (m: stone) => y(m) < 0xF ? stone(x(m), y(m) + 1) : 0;

            /** the 4 neighbors: L, R, T, B */
            export const all = (m: stone) => [l(m), r(m), t(m), b(m)];
        }
    }
}
