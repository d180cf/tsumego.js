/// <reference path="utils.ts" />
/// <reference path="sgf.ts" />

interface StrConfig {
    black?: (string) => string;
    white?: (string) => string;
    compact?: boolean;
    libs?: boolean;
    gids?: boolean;
}

class Board {
    size: uint;
    table: GIndex[];
    nlibs: uint[] = [0];
    gcols: Color[] = [0];
    chash: string;

    constructor(size: uint);
    constructor(size: uint, setup: string);
    constructor(size: uint, rows: string[]);
    constructor(sgf: string);

    constructor(size, setup?) {
        if (typeof size === 'string')
            this.initFromSGF(size);
        else {
            var $ = this, i;

            $.size = size;
            $.table = new Array(size * size);

            for (i = 0; i < $.table.length; i++)
                $.table[i] = 0;

            if (typeof setup === 'string') {
                setup.split(';').map(function (str, col) {
                    str.split(' ').map(parse).map(function (xy) {
                        let x = xy.x, y = xy.y, c = col ? -1 : +1;
                        if (!$.play(x, y, c))
                            throw new Error('Invalid setup.');
                    });
                });
            } else if (setup instanceof Array) {
                setup.map(function (str, y) {
                    str.split('').map(function (ch, x) {
                        let c = { 'X': +1, 'O': -1 }[ch];
                        if (c && !$.play(x, y, c))
                            throw new Error('Invalid setup.');
                    });
                });
            }
        }
    }

    private initFromSGF(source: string) {
        const sgf = SGF.parse(source);
        if (!sgf) throw new SyntaxError('Invalid SGF: ' + source);
        const setup = sgf.steps[0]; // ;FF[4]SZ[19]...
        const size = +setup['SZ'];

        this.size = size;
        this.table = new Array(size * size);

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
        board.chash = $.chash;
        board.table = $.table.slice(0);
        board.nlibs = $.nlibs.slice(0);
        board.gcols = $.gcols.slice(0);

        return board;
    }

    at(x: XIndex, y: YIndex): Color {
        var $ = this, n = $.size, t = $.table;
        return x < 0 || y < 0 || x >= n || y >= n ? 0 : t[y * n + x];
    }

    adjustLibs(s: Color, x: XIndex, y: YIndex, q: uint): void {
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

    remove(s: GIndex): uint {
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

    countLibs(s: GIndex): uint {
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

        if (t[y * n + x])
            return;

        $.chash = null;

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

    totalLibs(color: Color): uint {
        var $ = this, ns = $.nlibs, cs = $.gcols, i, n = 0;

        for (i = 0; i < ns.length; i++)
            if (cs[i] * color > 0)
                n += ns[i];

        return n;
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
        var board = this, t = board.table, h = board.chash, i, n = t.length;

        if (!h) {
            h = board.toString({ compact: true }).trim()
                .replace(/\x20/gm, '')
                .replace(/\n/gm, '|');

            /*
            for (i = 0; i < n; i++) {
                if (t[i]) {
                    h = ((h << 17) & 0xffffffff) | ((h >> (32 - 17)) & ((1 << 17) - 1));
                    h ^= 0xffffffff & (((t[i] > 0 ? 1 : 2) << 9) | i);
                }
            }
            */
        }

        return board.chash = h;
    }

    toStringSGF() {
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

    toString(config?: string|StrConfig): string {
        var $ = this, t = $.table, n = $.size, g = $.nlibs;
        var i, x, y, c, e, s = '', bs: XYIndex[] = [], ws: XYIndex[] = [];
        var hc = '  ', vc;
        var cB = 'X', cW = 'O';

        if (config == 'SGF') {
            return this.toStringSGF();
        } else {
            let cfg: StrConfig = config || {};

            if (cfg.black)
                cB = cfg.black(cB);
            if (cfg.white)
                cW = cfg.white(cW);

            let xmax = 0, ymax = 0;

            if (cfg.compact) {
                for (x = 0; x < n; x++)
                    for (y = 0; y < n; y++)
                        if ($.at(x, y))
                            xmax = max(x, xmax),
                            ymax = max(y, ymax);
            } else {
                xmax = n - 1;
                ymax = n - 1;
            }

            for (x = 0; x <= xmax; x++)
                hc += ' ' + xts(x);

            hc += '  ';

            if (!cfg.compact)
                s += hc;

            for (y = 0; y <= ymax; y++) {
                s += '\n';
                vc = y < 9 ? ' ' + (y + 1) : (y + 1);

                if (!cfg.compact)
                    s += vc;

                for (x = 0; x <= xmax; x++) {
                    c = $.at(x, y);
                    e = '.';

                    if (cfg.libs)
                        s += ' ' + (g[abs(c)] || e);
                    else if (cfg.gids)
                        s += ' ' + (abs(c) || e);
                    else
                        s += ' ' + (c > 0 ? cB : c < 0 ? cW : e);

                }

                if (!cfg.compact)
                    s += ' ' + vc;
            }

            if (!cfg.compact)
                s += '\n' + hc;
        }

        return s;
    }
}
