/// <reference path="utils.ts" />
/// <reference path="sgf.ts" />

class Board {
    size: uint;

    private table: GIndex[];
    private nlibs: uint[] = [0];
    private gcols: Color[] = [0];
    private _hash: string;

    constructor(size: uint);
    constructor(size: uint, rows: string[]);
    constructor(sgf: string);

    constructor(size, setup?) {
        if (typeof size === 'string')
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
            row.split('').map((chr, x) => {
                let c = chr == 'X' ? +1 : chr == 'O' ? -1 : 0;
                if (c && !this.play(x, y, c))
                    throw new Error('Invalid setup.');
            });
        });
    }

    private initFromSGF(source: string) {
        const sgf = SGF.parse(source);
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
        board.nlibs = $.nlibs.slice(0);
        board.gcols = $.gcols.slice(0);

        return board;
    }

    at(x: XIndex, y: YIndex): Color {
        var $ = this, n = $.size, t = $.table;
        return x < 0 || y < 0 || x >= n || y >= n ? 0 : t[y * n + x];
    }

    private adjustLibs(s: Color, x: XIndex, y: YIndex, q: uint): void {
        var $ = this, g = $.nlibs;

        var sl = $.at(x - 1, y);
        var sr = $.at(x + 1, y);
        var st = $.at(x, y + 1);
        var sb = $.at(x, y - 1);

        if (sl && (sl ^ s) < 0)
            g[abs(sl)] += q;

        if (sr && (sr ^ s) < 0 && sr != sl)
            g[abs(sr)] += q;

        if (st && (st ^ s) < 0 && st != sr && st != sl)
            g[abs(st)] += q;

        if (sb && (sb ^ s) < 0 && sb != st && sb != sr && sb != sl)
            g[abs(sb)] += q;
    }

    private remove(s: GIndex): uint {
        var $ = this, t = $.table, n = $.size, g = $.nlibs;
        var i = 0, x, y, r = 0;

        for (y = 0; y < n; y++) {
            for (x = 0; x < n; x++) {
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

    private countLibs(s: GIndex): uint {
        var $ = this, t = $.table, n = $.size;
        var i = 0, x, y, r = 0;

        for (y = 0; y < n; y++) {
            for (x = 0; x < n; x++) {
                if (!t[i])
                    if ($.at(x - 1, y) == s || $.at(x + 1, y) == s || $.at(x, y - 1) == s || $.at(x, y + 1) == s)
                        r++;

                i++;
            }
        }

        return r;
    }

    inBounds(x: XIndex, y: YIndex): boolean {
        var n = this.size;

        return x >= 0 && x < n && y >= 0 && y < n;
    }

    play(x: XIndex, y: YIndex, s: Color): uint {
        var $ = this, n = $.size, t = $.table, g = $.nlibs;
        var i, r = 0;

        if (t[y * n + x] || !this.inBounds(x, y))
            return;

        $._hash = null;

        // stone id

        var sl = $.at(x - 1, y);
        var sr = $.at(x + 1, y);
        var sb = $.at(x, y - 1);
        var st = $.at(x, y + 1);

        // libs number

        var nl = sl && g[abs(sl)];
        var nr = sr && g[abs(sr)];
        var nt = st && g[abs(st)];
        var nb = sb && g[abs(sb)];

        var kx, ky;

        // remove captured enemy neighbors

        if (nl == 1 && (s ^ sl) < 0)
            r += $.remove(sl), kx = x - 1, ky = y;

        if (nr == 1 && (s ^ sr) < 0)
            r += $.remove(sr), kx = x + 1, ky = y;

        if (nt == 1 && (s ^ st) < 0)
            r += $.remove(st), kx = x, ky = y + 1;

        if (nb == 1 && (s ^ sb) < 0)
            r += $.remove(sb), kx = x, ky = y - 1;

        // suicide is not allowed

        if (r == 0
            && (sl && (sl ^ s) < 0 || nl == 1 || x == 0)
            && (sr && (sr ^ s) < 0 || nr == 1 || x == n - 1)
            && (st && (st ^ s) < 0 || nt == 1 || y == n - 1)
            && (sb && (sb ^ s) < 0 || nb == 1 || y == 0)) {
            return 0;
        }

        // take away a lib of every neighbor group

        $.adjustLibs(s, x, y, -1);

        // new group id = min of neighbor group ids

        var gi = g.length;

        if (sl && (sl ^ s) >= 0)
            gi = min(gi, abs(sl));

        if (st && (st ^ s) >= 0)
            gi = min(gi, abs(st));

        if (sr && (sr ^ s) >= 0)
            gi = min(gi, abs(sr));

        if (sb && (sb ^ s) >= 0)
            gi = min(gi, abs(sb));

        // merge neighbors into one group

        var gs = s < 0 ? -gi : gi;

        if (sl && (sl ^ s) >= 0 && sl != gs) {
            for (i = 0; i < t.length; i++)
                if (t[i] == sl)
                    t[i] = gs;
            g[abs(sl)] = 0;
        }

        if (st && (st ^ s) >= 0 && st != gs) {
            for (i = 0; i < t.length; i++)
                if (t[i] == st)
                    t[i] = gs;
            g[abs(st)] = 0;
        }

        if (sr && (sr ^ s) >= 0 && sr != gs) {
            for (i = 0; i < t.length; i++)
                if (t[i] == sr)
                    t[i] = gs;
            g[abs(sr)] = 0;
        }

        if (sb && (sb ^ s) >= 0 && sb != gs) {
            for (i = 0; i < t.length; i++)
                if (t[i] == sb)
                    t[i] = gs;
            g[abs(sb)] = 0;
        }

        t[y * n + x] = gs;
        g[gi] = $.countLibs(gs);
        $.gcols[gi] = gs;

        return r + 1;
    }

    totalLibs(c: Color): uint {
        var $ = this, t = $.table, n = $.size;
        var i = 0, x, y, r = 0;

        for (y = 0; y < n; y++) {
            for (x = 0; x < n; x++) {
                if (!t[i])
                    if ($.at(x - 1, y) * c > 0 ||
                        $.at(x + 1, y) * c > 0 ||
                        $.at(x, y - 1) * c > 0 ||
                        $.at(x, y + 1) * c > 0)
                        r++;

                i++;
            }
        }

        return r;
    }

    nInAtari(color: Color): uint {
        var $ = this, ns = $.nlibs, cs = $.gcols, i, n = 0;

        for (i = 0; i < ns.length; i++)
            if (cs[i] * color > 0 && ns[i] < 2)
                n++;

        return n;
    }

    eulern(color: Color, q: number = 2): int {
        var board = this, n = board.size, x, y, a, b, c, d, n1 = 0, n2 = 0, n3 = 0;

        for (x = -1; x < n; x++) {
            for (y = -1; y < n; y++) {
                a = (board.at(x, y) * color) > 0;
                b = (board.at(x + 1, y) * color) > 0;
                c = (board.at(x + 1, y + 1) * color) > 0;
                d = (board.at(x, y + 1) * color) > 0;

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
                    const b = this.at(x, y);
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
                    if (fn(this.at(x, y)))
                        list += '[' + n2s(x) + n2s(y) + ']';

            return list && pf + list;
        }

        return '(;FF[4]SZ[' + this.size + ']'
            + take('AB', c => c > 0)
            + take('AW', c => c < 0) + ')';
    }

    private toStringTXT() {
        let xmax = 0, ymax = 0;

        for (let x = 0; x < this.size; x++)
            for (let y = 0; y < this.size; y++)
                if (this.at(x, y))
                    xmax = max(x, xmax),
                    ymax = max(y, ymax);

        let hc = '  ';

        for (let x = 0; x <= xmax; x++)
            hc += ' ' + String.fromCharCode(0x41 + x);

        let s = hc;

        for (let y = 0; y <= ymax; y++) {
            s += '\n';
            const vc = y < 9 ? ' ' + (y + 1) : (y + 1);

            s += vc;

            for (let x = 0; x <= xmax; x++) {
                const c = this.at(x, y);
                s += ' ';
                s += c > 0 ? 'X' : c < 0 ? 'O' : '-';
            }
        }

        return s;
    }

    toString(mode?: string): string {
        return mode == 'SGF' ?
            this.toStringSGF() :
            this.toStringTXT();
    }
}
