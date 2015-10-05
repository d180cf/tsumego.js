module tsumego {
    /**
     * bits 0..3 - the X coord
     * bits 5..7 - the Y coord
     *
     * the sign bit - the color; black = 0, white = 1
     */
    export type stone = number;

    export function stone(x: number, y: number, c = 0) {
        return x | y << 4 | c & 0x80000000;
    }

    export module stone {
        export const c = (m: stone) => m < 0 ? -1 : +1;

        export const x = (m: stone) => m & 15;
        export const y = (m: stone) => (m >> 4) & 15;

        export const coords = (m: stone) => [x(m), y(m)];

        export const toString = (m: stone) => (stone.c(m) > 0 ? '+' : '-') + stone.coords(m);
        export const fromSGF = (s: string) => stone(s2n(s[0]), s2n(s[1]));

        export module nb {
            export const l = (m: stone) => stone(x(m) - 1, y(m));
            export const r = (m: stone) => stone(x(m) + 1, y(m));
            export const t = (m: stone) => stone(x(m), y(m) - 1);
            export const b = (m: stone) => stone(x(m), y(m) + 1);

            /** the 4 neighbors: L, R, T, B */
            export const all = (m: stone) => [l(m), r(m), t(m), b(m)];
        }
    }
}
