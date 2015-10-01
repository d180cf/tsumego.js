/// <reference path="utils.ts" />
/// <reference path="move.ts" />
/// <reference path="prof.ts" />
/// <reference path="sgf.ts" />

module tsumego {
    'use strict';

    /**
     * A block descriptor is represented by a 32 bit signed integer:
     *
     * 0               1               2               3
     *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
     * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
     * | xmin  | xmax  | ymin  | ymax  |     libs      |    size     |c|
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
     * libs = 0 or size = 0 do not represent any real entity on the board.
     */
    export type block = number;

    export function block(xmin: number, xmax: number, ymin: number, ymax: number, libs: number, size: number, color: number) {
        return xmin | xmax << 4 | ymin << 8 | ymax << 12 | libs << 16 | size << 24 | color & 0x80000000;
    }

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
        export const rect = (b: block) => [xmin(b), xmax(b), ymin(b), ymax(b)];
        export const libs = (b: block) => b >> 16 & 255;
        export const size = (b: block) => b >> 24 & 127;

        /** A pseudo block descriptor with 1 liberty. */
        export const lib1 = block(0, 0, 0, 0, 1, 0, 0);
    }

    /**
     * A square board with size up to 16x16.
     *
     * The board's internal representation supports
     * very fast play(x, y, color) and undo() operations.
     */
    export class Board {
        /** 
         * The max board size is 16x16 because boundaries
         * of each block are stored in 4 bit integers. 
         */
        size: number;

        /** 
         * blocks[id] = a block descriptor with this block.id
         *
         * When block #1 is merged with block #2, its size is
         * reset to 0 and its libs is set to #2's id: this trick
         * allows to not modify the board table too often.
         *
         * This means that to get the block libs and other data
         * it's necessary to walk up the chain of merged blocks.
         * This operation is called "lifting" of the block id.
         *
         * When a block is captured, blocks[id] is reset to 0,
         * but the corresponding elements in the board table
         * aren't changed.
         *
         * Elements in this array are never removed. During the
         * lifetime of a block, its descriptor is changed and when
         * the block is captured, its descriptor is nulled, but is
         * never removed from the array.
         */
        blocks: block[] = [0];

        /** 
         * table[y * size + x] contains a block id or 0.
         *
         * When a block is merged with another block,
         * this table isn't changed, but the corresponding
         * descriptors of the two blocks get updated in the
         * list of blocks.
         *
         * When a block is captured, correponding cells in
         * this table aren't reset to 0. Instead, the block's
         * descriptor is nulled. This means that even if a table cell
         * contains a non-zero block id, that block may have
         * been deleted long ago. Thus a naive check !table[...]
         * is almost enevr correct: the block id needs to be
         * lifted first before it can be said whether it even
         * exists.
         */
        private table: block.id[];
        
        /**
         * Every time a stone is added, changes in the list of blocks
         * and in the board table are stored in the history so that that
         * stone can be quickly undone later. The history rarely exceeds
         * 40 moves, which is considered to be a very deep search when
         * solving a tsumego.
         */
        private history: {
            /** 
             * Every time a stone is added to the board,
             * the following record is added to this list:
             *
             * 0               1               2               3
             *  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
             * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
             * |   x   |   y   |    changed    |    block.id   |             |c|
             * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+             
             *
             * The coordinates are stored in the first byte.
             * The number of changed blocks is stored in the 2nd byte.
             * The block id replaced by this move in the table is stored in the 3rd byte.
             * The color of the stone is stored in the sign bit.
             */
            added: number[];

            /**
             * Every time a block is modified, its id and its previous descriptor
             * from blocks[id] is stored in this list. When a block is removed,
             * its descriptor is nulled.
             */
            changed: number[];
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
            if (size > 16)
                throw Error(`Board ${size}x${size} is too big. Up to 16x16 boards are supported.`);

            this.size = size;
            this.table = new Array(size * size);
            this.history = { added: [], changed: [] };
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

        /** 
         * Clones the board and all the history of moves.
         * This method is exceptionally slow.
         */
        fork(): Board {
            const json = JSON.parse(JSON.stringify(this));
            Object.setPrototypeOf(json, Board.prototype);
            return json as Board;
        }

        get(x: number, y: number): block;
        get(xy: XY): block;

        get(x: number, y?: number): block {
            if (y === void 0) {
                y = XY.y(x);
                x = XY.x(x);
            }

            return this.blocks[this.getBlockId(x, y)];
        }

        private lift(id: block.id): block.id {
            let bd;

            while (id && !block.size(bd = this.blocks[id]))
                id = block.libs(bd);

            return id;
        }

        /** 
         * Returns block id or zero. 
         * The block data can be read from blocks[id]. 
         */
        private getBlockId(x: number, y: number) {
            return this.isInBounds(x, y) ?
                this.lift(this.table[y * this.size + x]) :
                0;
        }

        /** 
         * Returns the four neighbors of the stone
         * in the [L, R, T, B] format. 
         */
        private getNbBlockIds(x: number, y: number) {
            return [
                this.getBlockId(x - 1, y),
                this.getBlockId(x + 1, y),
                this.getBlockId(x, y - 1),
                this.getBlockId(x, y + 1)
            ];
        }

        /** 
         * Adjusts libs of the four neighboring blocks
         * of the given color by the given quantity. 
         */
        private adjust(x: number, y: number, color: number, quantity: number) {
            const neighbors = this.getNbBlockIds(x, y);

            next: for (let i = 0; i < 4; i++) {
                const id = neighbors[i];
                const bd = this.blocks[id];

                if (bd * color <= 0)
                    continue;

                for (let j = 0; j < i; j++)
                    if (neighbors[j] == id)
                        continue next;

                this.change(id, bd + quantity * block.lib1);
            }
        }

        /**
         * emoves ablock from the board and adjusts
         * the number of liberties of affected blocks.
         */
        private remove(id: block.id) {
            const bd = this.blocks[id];
            const [xmin, xmax, ymin, ymax] = block.rect(bd);

            this.change(id, 0);

            for (let y = ymin; y <= ymax; y++)
                for (let x = xmin; x <= xmax; x++)
                    if (this.getBlockId(x, y) == id)
                        this.adjust(x, y, -bd, +1);
        }

        /** 
         * Changes the block descriptor and makes
         * an appropriate record in the history. 
         */
        private change(id: block.id, bd: block) {
            // adding a new block corresponds to a change from
            // blocks[blocks.length - 1] -> b
            this.history.changed.push(id, this.blocks[id] || 0);
            this.blocks[id] = bd;
        }

        inBounds(x: number, y: number): boolean;
        inBounds(xy: XY): boolean;

        inBounds(x: number, y?: number): boolean {
            if (y === void 0) {
                y = XY.y(x);
                x = XY.x(x);
            }

            return this.isInBounds(x, y);
        }

        private isInBounds(x: number, y: number) {
            const n = this.size;
            return x >= 0 && x < n && y >= 0 && y < n;
        }

        /** 
         * Returns the number of captured stones + 1.
         * If the move cannot be played, returns 0.
         * The move can be undone by undo().
         *
         * This method only sets table[y * size + x] to
         * to an appropriate block id and changes block
         * descriptors in the array of blocks. It doesn't
         * allocate temporary objects and thus is pretty fast.
         */
        play(x: number, y: number, color: number): number {
            if (this.getBlockId(x, y))
                return 0;

            const size = this.size;

            const n_changed = this.history.changed.length / 2; // id1, bd1, id2, bd2, ...

            const ids: block.id[] = this.getNbBlockIds(x, y);
            const nbs: block[] = [0, 0, 0, 0];
            const lib = [0, 0, 0, 0];

            for (let i = 0; i < 4; i++)
                nbs[i] = this.blocks[ids[i]],
                lib[i] = block.libs(nbs[i]);

            // remove captured blocks            

            let result = 0;

            for (let i = 0; i < 4; i++)
                if (lib[i] == 1 && color * nbs[i] < 0)
                    this.remove(ids[i]),
                    result += block.size(nbs[i]);

            if (result == 0
                /* L */ && (nbs[0] * color < 0 || lib[0] == 1 || x == 0)
                /* R */ && (nbs[1] * color < 0 || lib[1] == 1 || x == size - 1)
                /* T */ && (nbs[2] * color < 0 || lib[2] == 1 || y == 0)
                /* B */ && (nbs[3] * color < 0 || lib[3] == 1 || y == size - 1)) {
                // suicide is not allowed
                return 0;
            }            

            // take away a lib of every neighboring group

            this.adjust(x, y, color, -1);

            // new group id = min of neighboring group ids

            let id_new = this.blocks.length;
            let is_new = true;

            for (let i = 0; i < 4; i++)
                if (nbs[i] * color > 0 && ids[i] < id_new)
                    id_new = ids[i],
                    is_new = false;

            const id_old = this.table[y * size + x];

            this.table[y * size + x] = id_new;
            this._hash = null;

            if (is_new) {
                // create a new block if the new stone has no neighbors
                let n = 0;

                for (let i = 0; i < 4; i++)
                    if (!nbs[i] || lib[i] == 1)
                        n++;

                this.change(id_new, block(x, x, y, y, n, 1, color));
            } else {
                // merge neighbors into one block

                const fids = [id_new];

                for (let i = 0; i < 4; i++)
                    if (nbs[i] * color > 0 && ids[i] != id_new)
                        fids.push(ids[i]);

                let size_new = 1;

                let xmin_new = x;
                let xmax_new = x;
                let ymin_new = y;
                let ymax_new = y;

                for (let i = 0; i < fids.length; i++) {
                    const id = fids[i];
                    const bd = this.blocks[id];

                    size_new += block.size(bd);

                    const [xmin, xmax, ymin, ymax] = block.rect(bd);

                    xmin_new = min(xmin_new, xmin);
                    ymin_new = min(ymin_new, ymin);
                    xmax_new = max(xmax_new, xmax);
                    ymax_new = max(ymax_new, ymax);

                    // make the merged block point to the new block

                    if (id != id_new)
                        this.change(id, block(0, 0, 0, 0, id_new, 0, 0));
                }

                // libs need to be counted in the rectangle extended by 1 intersection

                let libs_new = 0;

                for (let y = max(ymin_new - 1, 0); y <= min(ymax_new + 1, this.size - 1); y++) {
                    for (let x = max(xmin_new - 1, 0); x <= min(xmax_new + 1, this.size - 1); x++) {
                        if (this.getBlockId(x, y))
                            continue;

                        const is_lib =
                            this.getBlockId(x - 1, y) == id_new ||
                            this.getBlockId(x + 1, y) == id_new ||
                            this.getBlockId(x, y - 1) == id_new ||
                            this.getBlockId(x, y + 1) == id_new;

                        if (is_lib)
                            libs_new++;
                    }
                }

                this.change(id_new, block(xmin_new, xmax_new, ymin_new, ymax_new, libs_new, size_new, color));
            }

            this.history.added.push(x | y << 4
                | this.history.changed.length / 2 - n_changed << 8
                | id_old << 16
                | color & 0x80000000);

            return result + 1;
        }

        /** 
         * Reverts the last move by restoring the original
         * block id in table[y * size + x] and by reverting
         * original values of block descriptors.
         */
        undo() {
            const move = this.history.added.pop();

            const x = move & 15;
            const y = move >> 4 & 15;
            const n = move >> 8 & 255;

            this.table[y * this.size + x] = move >> 16 & 255;

            for (let i = 0; i < n; i++) {
                const bd = this.history.changed.pop();
                const id = this.history.changed.pop();

                // when a new block is added, the corresponding
                // record in the history looks like changing
                // the last block from 0 to something;; to undo
                // this properly, the last element in the array
                // needs to be removed as well
                if (id == this.blocks.length - 1 && !bd)
                    this.blocks.pop();
            }
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
                    const b = this.get(x, y);

                    s += ' ';

                    s += showLibsNum ? block.libs(b) :
                        b > 0 ? 'X' :
                            b < 0 ? 'O' :
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
