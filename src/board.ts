/// <reference path="utils.ts" />
/// <reference path="move.ts" />
/// <reference path="prof.ts" />
/// <reference path="sgf.ts" />

module tsumego {
    'use strict';

    /**
     * A block is represented by a 32 bit signed integer:
     *
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * | xmin  | xmax  | ymin  | ymax  |  libs         |  size       | |
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     *
     * The first 2 bytes describe the rectangular boundaries of the block.
     * This implies that blocks must fit in 16x16 board.
     *
     * Next byte contains the number of liberties. Most of the blocks
     * hardly have 20 libs, so 8 bits should be more than enough.
     *
     * The first 7 bits of the last byte contain the number of stones
     * in the block, which gives up to 128 stones. Most of the blocks have
     * less than 15 stones.
     *
     * The last bit is the sign bit of the number and it tells the color
     * of the block: 0 = black, 1 = white. This implies that black blocks
     * are positive and white blocks are negative.
     *
     * Since a block a removed when it loses its last liberty, blocks with
     * libs = 0 or size = 0 do not exist.
     */
    export type block = number;

    export namespace block {
        /** 
         * The board is represented by a square matrix in which
         * each cell contains either block id or 0, if the intersection
         * is unoccupied. This is why block ids start with 1.
         */
        export type id = number;

        export const xmin = (b: block) => b & 15;
        export const xmax = (b: block) => b >> 4 & 15;
        export const ymin = (b: block) => b >> 8 & 15;
        export const ymax = (b: block) => b >> 12 & 15;
        export const libs = (b: block) => b >> 16 & 255;
        export const size = (b: block) => b >> 24 & 127;
    }

    export class Board {
        /** 
         * The max board size is 16x16 because boundaries
         * of each block are stored in 4 bit integers. 
         */
        size: number;

        /** 
         * table[y * size + x] contains a block id or 0. 
         *
         * When a block is merged with another block,
         * this table isn't changed, but the corresponding
         * two blocks get updated in the list of blocks.
         *
         * When a block is captured, correponding cells in
         * this table are reset to 0.
         */
        private table: block.id[];

        /** 
         * blocks[id] = a block with this block.id
         *
         * When block #1 is merged with block #2, its size is
         * reset to 0 and its libs is set to #2: this trick allows
         * to not modify the board table too often.
         *
         * This means that to get the block libs and other info
         * it's necessary to walk up the chain of merged blocks.
         *
         * When a block is captured, blocks[id] is reset to 0
         * and corresponding elements in the board table are erased.
         */
        private blocks: block[] = [0];

        /**
         * Every time a stone is added, changes in the list of blocks
         * and in the board table are stored in the history so that that
         * stone can be quickly undone later.
         */
        private history: {
            /** 
             * Every time a stone is added to the board,
             * the following record is added to this list:
             *
             * 0               1               2               3
             *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
             * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
             * |   x   |   y   |               blocks.length                 | |
             * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+             
             *
             * The coordinates are stored in the first byte.
             * The color is stored in the last bit (the sign bit): black = 0, white = 1.
             * The size of the blocks array before the move is made is stored in the remaining bits.
             */
            added: number[];

            /**
             * Every time a block is modified, its id and its previous version
             * from blocks[id] is stored in this list. When a block is removed,
             * the coordinates of its stones are added to the history as well.
             */
            blocks: number[];

            /**
             * When a block is removed, coordinates of all its stones are stored in the removed list.
             * The format of each entry is: bits 0..3 = x, bits 4..7 = y. The color isn't stored.
             * It's possible to not store the coordinates themselves, but only a bit mask with the
             * size of the block's boundary rectangle. It's debatable whether this would be more
             * efficient.
             */
            removed: number[];
        };

        private _hash: string;

        constructor(size: uint);
        constructor(size: uint, rows: string[]);
        constructor(sgf: string | SGF.Node);

        constructor(size, setup?) {
            if (typeof size === 'string' || typeof size === 'object')
                this.initFromSGF(size);
            else if (typeof size === 'number') {
                this.init(size);
                if (setup instanceof Array)
                    this.initFromTXT(setup);
            }
        }

        private init(size: number) {
            this.size = size;
            this.table = new Array(size * size);
        }

        private initFromTXT(rows: string[]) {
            rows.map((row, y) => {
                row.replace(/\s/g, '').split('').map((chr, x) => {
                    let c = chr == 'X' ? +1 : chr == 'O' ? -1 : 0;
                    if (c && !this.play(x, y, c))
                        throw new Error('Invalid setup.');
                });
            });
        }

        private initFromSGF(source: string | SGF.Node) {
            const sgf = typeof source === 'string' ? SGF.parse(source) : source;
            if (!sgf) throw new SyntaxError('Invalid SGF: ' + source);
            const setup = sgf.steps[0]; // ;FF[4]SZ[19]...
            const size = +setup['SZ'];

            this.init(size);

            const place = (tag: string, color: number) => {
                const stones = setup[tag];
                if (!stones) return;

                for (const xy of stones) {
                    const x = s2n(xy, 0);
                    const y = s2n(xy, 1);

                    if (!this.play(x, y, color))
                        throw new Error(tag + '[' + xy + '] cannot be added.');
                }
            };

            place('AW', -1);
            place('AB', +1);
        }

        fork(): Board {
            var $ = this, board = new Board(0);

            board.size = $.size;
            board._hash = $._hash;
            board.table = $.table.slice(0);
            board._libs = $._libs.slice(0);

            return board;
        }

        get(x: number, y?: number): BlockId {
            if (y === void 0) {
                y = XY.y(x);
                x = XY.x(x);
            }

            var $ = this, n = $.size, t = $.table;
            return x < 0 || y < 0 || x >= n || y >= n ? 0 : t[y * n + x];
        }

        private adjustLibs(s: Color, x: XIndex, y: YIndex, q: uint): void {
            const $ = this, g = $._libs;

            const sl = $.get(x - 1, y);
            const sr = $.get(x + 1, y);
            const st = $.get(x, y + 1);
            const sb = $.get(x, y - 1);

            if (sl * s < 0)
                g[abs(sl)] += q;

            if (sr * s < 0 && sr != sl)
                g[abs(sr)] += q;

            if (st * s < 0 && st != sr && st != sl)
                g[abs(st)] += q;

            if (sb * s < 0 && sb != st && sb != sr && sb != sl)
                g[abs(sb)] += q;
        }

        private remove(s: BlockId): uint {
            const $ = this, t = $.table, n = $.size, g = $._libs;

            let r = 0, i = 0;

            for (let y = 0; y < n; y++) {
                for (let x = 0; x < n; x++) {
                    if (t[i] == s) {
                        $.adjustLibs(s, x, y, +1);
                        t[i] = 0;
                        r++;
                    }

                    i++;
                }
            }

            g[s] = 0;
            return r;
        }

        private countLibs(s: BlockId): uint {
            const $ = this, t = $.table, n = $.size;
            let i = 0, r = 0;

            for (let y = 0; y < n; y++) {
                for (let x = 0; x < n; x++) {
                    if (!t[i])
                        if ($.get(x - 1, y) == s ||
                            $.get(x + 1, y) == s ||
                            $.get(x, y - 1) == s ||
                            $.get(x, y + 1) == s)
                            r++;

                    i++;
                }
            }

            return r;
        }

        inBounds(x: number, y?: number): boolean {
            if (y === void 0) {
                y = XY.y(x);
                x = XY.x(x);
            }

            var n = this.size;
            return x >= 0 && x < n && y >= 0 && y < n;
        }

        libs(block: BlockId) {
            return this._libs[abs(block)] || 0;
        }

        //@profile.time
        play(x: number, y: number, s: Color): uint {
            const $ = this, n = $.size, t = $.table, nn = t.length, g = $._libs;

            if (!$.inBounds(x, y) || t[y * n + x])
                return 0;

            // block ids

            const sl = $.get(x - 1, y);
            const sr = $.get(x + 1, y);
            const sb = $.get(x, y - 1);
            const st = $.get(x, y + 1);

            // libs number

            const nl = sl && g[abs(sl)];
            const nr = sr && g[abs(sr)];
            const nt = st && g[abs(st)];
            const nb = sb && g[abs(sb)];

            let r = 0;

            // remove captured enemy neighbors

            if (nl == 1 && s * sl < 0)
                r += $.remove(sl);

            if (nr == 1 && s * sr < 0)
                r += $.remove(sr);

            if (nt == 1 && s * st < 0)
                r += $.remove(st);

            if (nb == 1 && s * sb < 0)
                r += $.remove(sb);

            // suicide is not allowed

            if (r == 0
                && (sl * s < 0 || nl == 1 || x == 0)
                && (sr * s < 0 || nr == 1 || x == n - 1)
                && (st * s < 0 || nt == 1 || y == n - 1)
                && (sb * s < 0 || nb == 1 || y == 0)) {
                return 0;
            }

            // take away a lib of every neighbor group

            $.adjustLibs(s, x, y, -1);

            // new group id = min of neighbor group ids

            let gi = g.length;

            if (sl * s > 0)
                gi = min(gi, abs(sl));

            if (st * s > 0)
                gi = min(gi, abs(st));

            if (sr * s > 0)
                gi = min(gi, abs(sr));

            if (sb * s > 0)
                gi = min(gi, abs(sb));

            // merge neighbors into one group

            let gs = s < 0 ? -gi : gi;

            if (sl * s > 0 && sl != gs) {
                for (let i = 0; i < nn; i++)
                    if (t[i] == sl)
                        t[i] = gs;
                g[abs(sl)] = 0;
            }

            if (st * s > 0 && st != gs) {
                for (let i = 0; i < nn; i++)
                    if (t[i] == st)
                        t[i] = gs;
                g[abs(st)] = 0;
            }

            if (sr * s > 0 && sr != gs) {
                for (let i = 0; i < nn; i++)
                    if (t[i] == sr)
                        t[i] = gs;
                g[abs(sr)] = 0;
            }

            if (sb * s > 0 && sb != gs) {
                for (let i = 0; i < nn; i++)
                    if (t[i] == sb)
                        t[i] = gs;
                g[abs(sb)] = 0;
            }

            t[y * n + x] = gs;
            g[gi] = $.countLibs(gs);
            $._hash = null;

            return r + 1;
        }

        totalLibs(c: Color): uint {
            var $ = this, t = $.table, n = $.size;
            var i = 0, x, y, r = 0;

            for (y = 0; y < n; y++) {
                for (x = 0; x < n; x++) {
                    if (!t[i])
                        if ($.get(x - 1, y) * c > 0 ||
                            $.get(x + 1, y) * c > 0 ||
                            $.get(x, y - 1) * c > 0 ||
                            $.get(x, y + 1) * c > 0)
                            r++;

                    i++;
                }
            }

            return r;
        }

        eulern(color: Color, q: number = 2): int {
            var board = this, n = board.size, x, y, a, b, c, d, n1 = 0, n2 = 0, n3 = 0;

            for (x = -1; x < n; x++) {
                for (y = -1; y < n; y++) {
                    a = (board.get(x, y) * color) > 0;
                    b = (board.get(x + 1, y) * color) > 0;
                    c = (board.get(x + 1, y + 1) * color) > 0;
                    d = (board.get(x, y + 1) * color) > 0;

                    switch (a + b + c + d) {
                        case 1: n1++; break;
                        case 2: if (a == c) n2++; break;
                        case 3: n3++; break;
                    }
                }
            }

            return (n1 - n3 + q * n2) / 4;
        }

        hash(): string {
            if (!this._hash) {
                const n = this.size;
                let h = '', len = 0;

                for (let y = 0; y < n; y++) {
                    let rx = h.length;

                    for (let x = 0; x < n; x++) {
                        const b = this.get(x, y);
                        h += b > 0 ? 'X' : b < 0 ? 'O' : '-';
                        if (b) len = rx = h.length;
                    }

                    h = h.slice(0, rx) + ';';
                }

                this._hash = n + 'x' + n + '(' + h.slice(0, len) + ')';
            }

            return this._hash;
        }

        private toStringSGF() {
            const take = (pf: string, fn: (g: number) => boolean) => {
                let list = '';

                for (let y = 0; y < this.size; y++)
                    for (let x = 0; x < this.size; x++)
                        if (fn(this.get(x, y)))
                            list += '[' + n2s(x) + n2s(y) + ']';

                return list && pf + list;
            }

            return '(;FF[4]SZ[' + this.size + ']'
                + take('AB', c => c > 0)
                + take('AW', c => c < 0) + ')';
        }

        private toStringTXT(mode = '') {
            const hideLabels = /L-/.test(mode);
            const showLibsNum = /R/.test(mode);

            let xmax = 0, ymax = 0, s = '';

            for (let x = 0; x < this.size; x++)
                for (let y = 0; y < this.size; y++)
                    if (this.get(x, y))
                        xmax = max(x, xmax),
                        ymax = max(y, ymax);

            if (!hideLabels) {
                s += '  ';

                for (let x = 0; x <= xmax; x++)
                    s += ' ' + String.fromCharCode(0x41 + (x < 8 ? x : x + 1)); // skip I
            }

            for (let y = 0; y <= ymax; y++) {
                if (s)
                    s += '\n';

                if (!hideLabels) {
                    const n = (this.size - y) + '';
                    s += n.length < 2 ? ' ' + n : n;;
                }

                for (let x = 0; x <= xmax; x++) {
                    const c = this.get(x, y);

                    s += ' ';

                    s += showLibsNum ? this.libs(c) :
                        c > 0 ? 'X' :
                            c < 0 ? 'O' :
                                '-';
                }
            }

            return s;
        }

        toString(mode?: string): string {
            return mode == 'SGF' ?
                this.toStringSGF() :
                this.toStringTXT(mode);
        }
    }
}
