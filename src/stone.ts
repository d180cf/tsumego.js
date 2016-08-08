module tsumego {
    const kCoord = 0x20000000;
    const kColor = 0x40000000;
    const kWhite = 0x80000000;

    /**
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * |   x   |   y   |        r       |                    | k |h|c|w|
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     *  x - the x coord (valid only if h = 1)
     *  y - the y coord (valid only if h = 1)
     *  h - whether the stone has coordinates
     *  c - whether the stone has a color
     *  w - whether the stone is white (valid if c = 1)
     *  r - depth at which repetition occurs
     *  k - who is the ko master: +1, 0, -1
     */
    export enum stone { }

    export module stone {
        export function make(x: number, y: number, color: number): stone {
            return x | y << 4 | kCoord | (color && kColor) | color & kWhite;
        }
    }

    export module stone {
        export const nocoords = (color: number) => kColor | color & kWhite;
        export const color = (m: stone) => (m & kColor) && (m & kWhite ? -1 : +1);
        export const setcolor = (m: stone, c: number) => m & ~kColor & ~kWhite | (c && kColor) | c & kWhite;
        export const hascoords = (m: stone) => !!(m & kCoord);

        export const x = (m: stone) => m & 15;
        export const y = (m: stone) => m >> 4 & 15;

        export const coords = (m: stone) => [x(m), y(m)];

        export const same = (a: stone, b: stone) => !((a ^ b) & 255);
        export const dist = (a: stone, b: stone) => Math.abs(x(a) - x(b)) + Math.abs(y(a) - y(b));

        export const neighbors = (m: stone) => {
            const [x, y] = stone.coords(m);
            const c = stone.color(m);

            return [
                x <= 0x0 ? 0 : stone.make(x - 1, y, c),
                x >= 0xF ? 0 : stone.make(x + 1, y, c),
                y <= 0x0 ? 0 : stone.make(x, y - 1, c),
                y >= 0xF ? 0 : stone.make(x, y + 1, c)];
        }

        export const diagonals = (m: stone) => {
            const [x, y] = stone.coords(m);
            const c = stone.color(m);

            return [
                x <= 0x0 || y <= 0x0 ? 0 : stone.make(x - 1, y - 1, c),
                x >= 0xF || y <= 0x0 ? 0 : stone.make(x + 1, y - 1, c),
                x <= 0x0 || y >= 0xF ? 0 : stone.make(x - 1, y + 1, c),
                x >= 0xF || y >= 0xF ? 0 : stone.make(x + 1, y + 1, c)];
        }

        export class SmallSet {
            private stones: stone[] = [];

            constructor(private test = same) {

            }

            toString() {
                return '[' + this.stones.sort((a, b) => a - b).map(stone.toString).join(',') + ']';
            }

            has(s: stone) {
                for (const x of this.stones)
                    if (this.test(x, s))
                        return true;

                return false;
            }

            add(s: stone) {
                if (!this.has(s))
                    this.stones.push(s);
            }

            remove(p: ((s: stone) => boolean) | stone) {
                for (let i = this.stones.length - 1; i >= 0; i--) {
                    const q = this.stones[i];

                    if (typeof p === 'function' ? p(q) : same(p, q))
                        this.stones.splice(i, 1);
                }
            }

            /** Adds the item if it wasn't there or removes it otherwise. */
            xor(s: stone) {
                if (this.has(s))
                    this.remove(s);
                else
                    this.add(s);
            }

            empty() {
                this.stones = [];
            }

            get size() {
                return this.stones.length;
            }

            *[Symbol.iterator]() {
                for (const s of this.stones)
                    yield s;
            }
        }
    }

    export const infdepth = 255; // only 8 bits available for storing the depth

    /**
     * If b(1), b(2), ... is the sequence of positions leading
     * to the current position and the sub tree (sub graph, actually)
     * of positions that proves the solution contains any of
     * b(i), then repd.get(solution) = i.
     */
    export module repd {
        export const get = move => move >> 8 & 255;
        export const set = (move, repd) => move & ~0xFF00 | repd << 8;
    }

    export module stone.km {
        export const get = (s: stone): color => s << 3 >> 30; // the signed shift
        export const set = (s: stone, km: color) => s & ~0x18000000 | (km & 3) << 27;
    }

    export module stone.label {
        /** W -> -1, B -> +1 */
        export function color(label: string): color {
            if (label == 'B') return +1;
            if (label == 'W') return -1;

            return 0;
        }

        /** -1 -> W, +1 -> B */
        export function string(color: number) {
            if (color > 0) return 'B';
            if (color < 0) return 'W';
        }
    }

    export module stone {
        const n2s = (n: number) => String.fromCharCode(n + 0x61); // 0 -> `a`, 3 -> `d`
        const s2n = (s: string) => s.charCodeAt(0) - 0x61; // `d` -> 43 `a` -> 0

        /** e.g. W[ab], [ab], W[] */
        export function toString(m: stone) {
            const c = color(m);
            const [x, y] = coords(m);
            const s = !hascoords(m) ? '' : n2s(x) + n2s(y);
            const t = label.string(c) || '';
            const _nr = repd.get(m);

            return t + '[' + s + ']'
                + (_nr ? ' depth=' + _nr : '');
        }

        export function fromString(s: string): stone {
            if (s == 'B' || s == 'B[]') return stone.nocoords(+1);
            if (s == 'W' || s == 'W[]') return stone.nocoords(-1);

            if (!/^[BW]\[[a-z]{2}\]|[a-z]{2}$/.test(s))
                return 0;

            const c = { B: +1, W: -1 }[s[0]] || 0;
            if (c) s = s.slice(2);

            const x = s2n(s[0]);
            const y = s2n(s[1]);

            return stone.make(x, y, c);
        }

        export module list {
            export const toString = (x: stone[]) => '[' + x.map(stone.toString).join(',') + ']';
        }
    }

    export module stone.cc {
        /** 0x25 -> "E2" */
        export function toString(s: stone, boardSize: number) {
            const x = stone.x(s);
            const y = stone.y(s);

            const xs = String.fromCharCode('A'.charCodeAt(0) + (x < 8 ? x : x + 1)); // skip the I letter
            const ys = (boardSize - y) + '';

            return xs + ys;
        }
    }
}
