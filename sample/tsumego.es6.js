'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var tsumego;
(function (tsumego) {
    tsumego.version = '0.1.0';
    tsumego.min = function (a, b) {
        return a < b ? a : b;
    };
    tsumego.max = function (a, b) {
        return a > b ? a : b;
    };
    tsumego.abs = function (a) {
        return a < 0 ? -a : a;
    };
    tsumego.nesw = [[-1, 0], [+1, 0], [0, -1], [0, +1]];
    function* region(root, belongs) {
        let body = [];
        let edge = [root];
        while (edge.length > 0) {
            let xy = edge.pop();
            yield xy;
            body.push(xy);
            for (let nxy of tsumego.stone.neighbors(xy)) if (belongs(nxy, xy) && body.indexOf(nxy) < 0 && edge.indexOf(nxy) < 0) edge.push(nxy);
        }
    }
    tsumego.region = region;

    let SortedArray = (function () {
        /**
         * The items will be sorted in such a way that
         * compare(flags[i], flags[i + 1]) <= 0 for every i:
         * To sort items in a specific order:
         *
         *      ascending:  (a, b) => a - b
         *      descending: (a, b) => b - a
         *
         * To sort first by one field in the ascneding order
         * and then by another field in the descending order:
         *
         *      (a, b) =>
         *          a[0] - b[0] ||
         *          a[1] - b[1];
         *
         * This is exactly how Array::sort works.
         */

        function SortedArray(compare) {
            _classCallCheck(this, SortedArray);

            this.compare = compare;
        }

        SortedArray.prototype.reset = function reset() {
            this.flags = [];
            this.items = [];
            return this.items;
        };

        /**
         * Inserts a new item in a "stable" way, i.e.
         * if items are taken from one array which is
         * sorted according to some criteria #A and inserted
         * into this array, not only the items will be
         * sorted here by the new criteria #B, but also items
         * for which #B doesn't define a specific order
         * (returns zero in other words), will be correctly
         * ordered according to #A. More strictly, for any i < j:
         *
         *      1. B(sa[i], sa[j]) <= 0
         *      2. if B(sa[i], sa[j]) = 0 then A(sa[i], sa[j]) <= 0
         *
         * This property allows to compose a few sorted arrays.
         */

        SortedArray.prototype.insert = function insert(item, flag) {
            let items = this.items;
            let flags = this.flags;
            let compare = this.compare;

            let i = items.length;
            while (i > 0 && compare(flags[i - 1], flag) > 0) i--;
            // using .push when i == n and .unshift when i == 0
            // won't make the solver run faster
            items.splice(i, 0, item);
            flags.splice(i, 0, flag);
            return i;
        };

        return SortedArray;
    })();

    tsumego.SortedArray = SortedArray;
    tsumego.b4 = function (b0, b1, b2, b3) {
        return b0 | b1 << 8 | b2 << 16 | b3 << 24;
    };
    tsumego.b0 = function (b) {
        return b & 255;
    };
    tsumego.b1 = function (b) {
        return b >> 8 & 255;
    };
    tsumego.b2 = function (b) {
        return b >> 16 & 255;
    };
    tsumego.b3 = function (b) {
        return b >> 24 & 255;
    };
    tsumego.b_ = function (b) {
        return [tsumego.b0(b), tsumego.b1(b), tsumego.b2(b), tsumego.b3(b)];
    };
    function sequence(n, f) {
        let x = [];
        while (n-- > 0) x.push(f());
        return x;
    }
    tsumego.sequence = sequence;
    tsumego.hex = function (x) {
        return (0x100000000 + x).toString(16).slice(-8);
    };
    tsumego.rcl = function (x, n) {
        return x << n | x >>> 32 - n;
    };
    function memoized(fn, hashArgs) {
        let cache = {};
        return fn && function (x) {
            let h = hashArgs(x);
            return h in cache ? cache[h] : cache[h] = fn(x);
        };
    }
    tsumego.memoized = memoized;
    /** e.g. @enumerable(false) */
    function enumerable(isEnumerable) {
        return function (p, m, d) {
            return void (d.enumerable = isEnumerable);
        };
    }
    tsumego.enumerable = enumerable;
})(tsumego || (tsumego = {}));
var tsumego;
(function (tsumego) {
    let kCoord = 0x20000000;
    let kColor = 0x40000000;
    let kWhite = 0x80000000;
    function stone(x, y, color) {
        return x | y << 4 | kCoord | (color && kColor) | color & kWhite;
    }
    tsumego.stone = stone;
    var stone;
    (function (stone) {
        stone.nocoords = function (color) {
            return kColor | color & kWhite;
        };
        stone.color = function (m) {
            return m & kColor && (m & kWhite ? -1 : +1);
        };
        stone.hascoords = function (m) {
            return !!(m & kCoord);
        };
        stone.x = function (m) {
            return m & 15;
        };
        stone.y = function (m) {
            return m >> 4 & 15;
        };
        stone.coords = function (m) {
            return [stone.x(m), stone.y(m)];
        };
        stone.neighbors = function (m) {
            var _stone$coords = stone.coords(m);

            let x = _stone$coords[0];
            let y = _stone$coords[1];

            let c = stone.color(m);
            return [x <= 0x0 ? 0 : stone(x - 1, y, c), x >= 0xF ? 0 : stone(x + 1, y, c), y <= 0x0 ? 0 : stone(x, y - 1, c), y >= 0xF ? 0 : stone(x, y + 1, c)];
        };
    })(stone = tsumego.stone || (tsumego.stone = {}));
    var stone;
    (function (stone) {
        let n2s = function n2s(n) {
            return String.fromCharCode(n + 0x61);
        }; // 0 -> `a`, 3 -> `d`
        let s2n = function s2n(s) {
            return s.charCodeAt(0) - 0x61;
        }; // `d` -> 43 `a` -> 0
        function toString(m) {
            let c = stone.color(m);

            var _stone$coords2 = stone.coords(m);

            let x = _stone$coords2[0];
            let y = _stone$coords2[1];

            let s = !stone.hascoords(m) ? null : n2s(x) + n2s(y);
            let t = c > 0 ? 'B' : 'W';
            return !c ? s : !s ? t : t + '[' + s + ']';
        }
        stone.toString = toString;
        function fromString(s) {
            if (!/^[BW]\[[a-z]{2}\]|[a-z]{2}$/.test(s)) throw SyntaxError('Invalid move: ' + s);
            let c = ({ B: +1, W: -1 })[s[0]] || 0;
            if (c) s = s.slice(2);
            let x = s2n(s[0]);
            let y = s2n(s[1]);
            return stone(x, y, c);
        }
        stone.fromString = fromString;
    })(stone = tsumego.stone || (tsumego.stone = {}));
})(tsumego || (tsumego = {}));
var tsumego;
(function (tsumego) {
    var rand;
    (function (rand) {
        var LCG;
        (function (LCG) {
            /**
             * The LCG has the max period iff:
             *
             *  1. c and m are relatively prime
             *  2. (a - 1) is divisible by all prime factors of m
             *  3. (a - 1) is divisible by 4 if m is divisible by 4
             *
             * https://en.wikipedia.org/wiki/Linear_congruential_generator
             */
            let LCG32 = function LCG32(a, c) {
                return function (x) {
                    return function () {
                        return x = a * x + c | 0;
                    };
                };
            };
            LCG.NR32 = LCG32(1664525, 1013904223);
            LCG.NR01 = function (x) {
                let g = arguments.length <= 1 || arguments[1] === undefined ? LCG.NR32(x) : arguments[1];
                return (function () {
                    return function () {
                        return Math.abs(g() / 0x80000000);
                    };
                })();
            };
        })(LCG = rand.LCG || (rand.LCG = {}));
    })(rand = tsumego.rand || (tsumego.rand = {}));
})(tsumego || (tsumego = {}));
var tsumego;
(function (tsumego) {
    var profile;
    (function (profile) {
        profile.enabled = true;
        profile.now = typeof performance === 'undefined' ? function () {
            return Date.now();
        } : function () {
            return performance.now();
        };
        let timers = {};
        let counters = {};
        let distributions = {};
        function reset() {
            for (let name in timers) timers[name] = 0;
            profile.started = profile.now();
        }
        profile.reset = reset;
        function log() {
            if (profile.started >= 0) {
                let total = profile.now() - profile.started;
                console.log('Total: ' + (total / 1000).toFixed(2) + 's');
                for (let name in timers) console.log(name + ': ' + (timers[name] / total * 100 | 0) + '%');
            }
            if (Object.keys(counters).length > 0) {
                console.log('counters:');
                for (let name in counters) console.log('  ' + name + ': ' + counters[name]);
            }
            if (Object.keys(distributions).length > 0) {
                console.log('distributions:');
                for (let name in distributions) {
                    let d = distributions[name];
                    let n = d.length;
                    let lb,
                        rb,
                        min,
                        max,
                        sum = 0;
                    for (let i = 0; i < n; i++) {
                        if (d[i] === undefined) continue;
                        rb = i;
                        if (lb === undefined) lb = i;
                        if (min === undefined || d[i] < min) min = d[i];
                        if (max === undefined || d[i] > max) max = d[i];
                        sum += d[i];
                    }
                    console.log('  ' + name + ':');
                    for (let i = lb; i <= rb; i++) if (d[i] !== undefined) console.log('    ' + i + ': ' + d[i] + ' = ' + (d[i] / sum * 100 | 0) + '%');
                }
            }
        }
        profile.log = log;
        function _time(name, fn) {
            if (!profile.enabled) return fn;
            timers[name] = 0;
            return function () {
                let started = profile.now();
                try {
                    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                        args[_key] = arguments[_key];
                    }

                    return fn.apply(this, args);
                } finally {
                    timers[name] += profile.now() - started;
                }
            };
        }
        profile._time = _time;
        /** Measures time taken by all invocations of the method. */
        function time(prototype, method, d) {
            d.value = _time(prototype.constructor.name + '::' + method, d.value);
        }
        profile.time = time;

        let Counter = (function () {
            function Counter(name) {
                _classCallCheck(this, Counter);

                this.name = name;
                counters[name] = 0;
            }

            Counter.prototype.inc = function inc() {
                let n = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

                counters[this.name] += n;
            };

            return Counter;
        })();

        profile.Counter = Counter;

        let Distribution = (function () {
            function Distribution(name) {
                _classCallCheck(this, Distribution);

                this.d = distributions[name] = [];
            }

            Distribution.prototype.inc = function inc(value) {
                let n = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

                this.d[value] = (this.d[value] | 0) + n;
            };

            return Distribution;
        })();

        profile.Distribution = Distribution;
    })(profile = tsumego.profile || (tsumego.profile = {}));
})(tsumego || (tsumego = {}));
/** Generic LL(*) recursive descent parser. */
var tsumego;
(function (tsumego) {
    var parser;
    (function (parser) {
        let Pattern = (function () {
            function Pattern(_text, _exec) {
                _classCallCheck(this, Pattern);

                this._text = _text;
                this._exec = _exec;
            }

            Pattern.prototype.toString = function toString() {
                return this._text;
            };

            Pattern.prototype.exec = function exec(str, pos) {
                let r = this._exec.call(null, str, pos || 0);
                //console.log(this + '', str.slice(pos, pos + 10), r);
                if (typeof pos === 'number') return r;
                if (r && r[1] == str.length) return r[0];
                return null;
            };

            Pattern.prototype.map = function map(fn) {
                var _this = this;

                return $(':' + this, function (str, pos) {
                    let r = _this.exec(str, pos);
                    return r ? [fn(r[0]), r[1]] : null;
                });
            };

            Pattern.prototype.take = function take(i) {
                return this.map(function (r) {
                    return r[i];
                });
            };

            Pattern.prototype.slice = function slice(from, to) {
                return this.map(function (r) {
                    return r.slice(from, to);
                });
            };

            /** [["A", 1], ["B", 2]] -> { A: 1, B: 2 } */

            Pattern.prototype.fold = function fold(k, v) {
                let merge = arguments.length <= 2 || arguments[2] === undefined ? function (a, b) {
                    return b;
                } : arguments[2];

                return this.map(function (r) {
                    let m = {};
                    for (let p of r) m[p[k]] = merge(m[p[k]], p[v]);
                    return m;
                });
            };

            Pattern.prototype.rep = function rep() {
                var _this2 = this;

                let min = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

                return $(min + '*' + this, function (str, pos) {
                    let res = [];
                    let r;
                    while (r = _this2.exec(str, pos)) {
                        res.push(r[0]);
                        pos = r[1];
                    }
                    return res.length >= min ? [res, pos] : null;
                });
            };

            return Pattern;
        })();

        parser.Pattern = Pattern;
        function $(x, s) {
            if (typeof s === 'function') return new Pattern(x, s);
            if (arguments.length > 1) return seq.apply(null, arguments);
            if (x instanceof Pattern) return x;
            if (x instanceof RegExp) return rgx(x);
            if (typeof x === 'string') return txt(x);
        }
        parser.$ = $;
        function rgx(r) {
            return $(r + '', function (str, pos) {
                let m = r.exec(str.slice(pos));
                return m && m.index == 0 ? [m[0], pos + m[0].length] : null;
            });
        }
        function txt(s) {
            return $('"' + s + '"', function (str, pos) {
                return str.slice(pos, pos + s.length) == s ? [s, pos + s.length] : null;
            });
        }
        function seq() {
            for (var _len2 = arguments.length, ps = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                ps[_key2] = arguments[_key2];
            }

            return $('(' + ps.join(' ') + ')', function (str, pos) {
                let res = [];
                for (let p of ps) {
                    let r = $(p).exec(str, pos);
                    if (!r) return null;
                    res.push(r[0]);
                    pos = r[1];
                }
                return [res, pos];
            });
        }
    })(parser = tsumego.parser || (tsumego.parser = {}));
})(tsumego || (tsumego = {}));
/// <reference path="rdp.ts" />
/**
 * SGF parser.
 *
 * www.red-bean.com/sgf
 */
var tsumego;
(function (tsumego) {
    var SGF;
    (function (SGF) {
        let $ = tsumego.parser.$;
        /**
         * Node FF[4]SZ[19](;B[aa];W[bb])(;B[ab];W[cb]) gets decomposed into:
         *
         *      steps[0]: { FF: [4], SZ:[19] }
         *      vars[0]: B[aa];W[bb]
         *      vars[1]: B[ab];W[cb]
         */

        let Node = (function () {
            function Node(steps, vars) {
                _classCallCheck(this, Node);

                this.steps = steps;
                this.vars = vars;
            }

            Node.prototype.get = function get(tag) {
                return this.steps[0][tag];
            };

            return Node;
        })();

        SGF.Node = Node;
        // decorators break the source-map-support tool
        Object.defineProperty(Node.prototype, 'get', {
            enumerable: false
        });
        /**
         * Parses an SGF input according to these rules:
         *
         *      val = `[` ... `]`
         *      tag = 1*(`A`..`Z`) *val
         *      stp = `;` *tag
         *      sgf = `(` *stp *sgf `)`
         *
         * Returns AST of the input.
         */
        function parse(source) {
            let wsp = $(/\s*/);
            let val = $(wsp, /\[[^\]]*?\]/).take(1).slice(+1, -1);
            let tag = $(wsp, /\w+/, val.rep()).slice(1);
            let stp = $(wsp, ';', tag.rep()).take(2).fold(0, 1, function (a, b) {
                return (a || []).concat(b);
            });
            let sgf = $(wsp, '(', stp.rep(), $('sgf', function (s, i) {
                return sgf.exec(s, i);
            }).rep(), wsp, ')', wsp).map(function (r) {
                return new Node(r[2], r[3]);
            });
            return sgf.exec(source);
        }
        SGF.parse = parse;
    })(SGF = tsumego.SGF || (tsumego.SGF = {}));
})(tsumego || (tsumego = {}));
/// <reference path="utils.ts" />
/// <reference path="move.ts" />
/// <reference path="rand.ts" />
/// <reference path="prof.ts" />
/// <reference path="sgf.ts" />
var tsumego;
(function (tsumego) {
    function block(xmin, xmax, ymin, ymax, libs, size, color) {
        return xmin | xmax << 4 | ymin << 8 | ymax << 12 | libs << 16 | size << 24 | color & 0x80000000;
    }
    tsumego.block = block;
    var block;
    (function (block) {
        block.xmin = function (b) {
            return b & 15;
        };
        block.xmax = function (b) {
            return b >> 4 & 15;
        };
        block.ymin = function (b) {
            return b >> 8 & 15;
        };
        block.ymax = function (b) {
            return b >> 12 & 15;
        };
        block.dims = function (b) {
            return [block.xmin(b), block.xmax(b), block.ymin(b), block.ymax(b)];
        };
        block.libs = function (b) {
            return b >> 16 & 255;
        };
        block.size = function (b) {
            return b >> 24 & 127;
        };
        block.join = function (b1, b2) {
            return block(tsumego.min(block.xmin(b1), block.xmin(b2)), tsumego.max(block.xmax(b1), block.xmax(b2)), tsumego.min(block.ymin(b1), block.ymin(b2)), tsumego.max(block.ymax(b1), block.ymax(b2)), 0, 0, 0);
        };
        /** A pseudo block descriptor with 1 liberty. */
        block.lib1 = block(0, 0, 0, 0, 1, 0, 0);
        /** Useful when debugging. */
        block.toString = function (b) {
            return !b ? null : (b > 0 ? '+' : '-') + '[' + block.xmin(b) + ', ' + block.xmax(b) + ']x' + '[' + block.ymin(b) + ', ' + block.ymax(b) + '] ' + 'libs=' + block.libs(b) + ' ' + 'size=' + block.size(b);
        };
    })(block = tsumego.block || (tsumego.block = {}));
    /**
     * A random 32 bit number for each intersection in the 16x16 board.
     * The hash of the board is then computed as H(B) = XOR Q(i, j) where
     *
     *      Q(i, j) = hashtb[i, j] if B(i, j) is a B stone
     *      Q(i, j) = hashtw[i, j] if B(i, j) is a W stone
     *
     * This is also known as Zobrist hashing.
     */
    let hashtb = tsumego.sequence(256, tsumego.rand.LCG.NR32(221627394));
    let hashtw = tsumego.sequence(256, tsumego.rand.LCG.NR32(473923848));
    /**
     * A square board with size up to 16x16.
     *
     * The board's internal representation supports
     * very fast play(x, y, color) and undo() operations.
     */

    let Board = (function () {
        function Board(size, setup) {
            _classCallCheck(this, Board);

            /**
             * The 32 bit hash of the board. It's efficiently
             * recomputed after each move.
             */
            this.hash = 0;
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
            this.blocks = [0];
            if (typeof size === 'string' || typeof size === 'object') this.initFromSGF(size, setup);else if (typeof size === 'number') {
                this.init(size);
                if (setup instanceof Array) this.initFromTXT(setup);
            }
            this.drop();
        }

        Board.prototype.init = function init(size) {
            if (size > 16) throw Error('Board ' + size + 'x' + size + ' is too big. Up to 16x16 boards are supported.');
            this.size = size;
            this.table = new Array(size * size);
            this.drop();
            for (let i = 0; i < size * size; i++) this.table[i] = 0;
        };

        Board.prototype.initFromTXT = function initFromTXT(rows) {
            var _this3 = this;

            rows.map(function (row, y) {
                row.replace(/\s/g, '').split('').map(function (chr, x) {
                    let c = chr == 'X' ? +1 : chr == 'O' ? -1 : 0;
                    if (c && !_this3.play(tsumego.stone(x, y, c))) throw new Error('Invalid setup.');
                });
            });
        };

        Board.prototype.initFromSGF = function initFromSGF(source, nvar) {
            var _this4 = this;

            let sgf = typeof source === 'string' ? tsumego.SGF.parse(source) : source;
            if (!sgf) throw new SyntaxError('Invalid SGF: ' + source);
            let setup = sgf.steps[0]; // ;FF[4]SZ[19]...
            let size = +setup['SZ'];
            if (!size) throw SyntaxError('SZ[n] tag must specify the size of the board.');
            this.init(size);
            let place = function place(stones, tag) {
                if (!stones) return;
                for (let xy of stones) {
                    let s = tag + '[' + xy + ']';
                    if (!_this4.play(tsumego.stone.fromString(s))) throw new Error(s + ' cannot be added.');
                }
            };
            function placevar(node) {
                place(node.steps[0]['AW'], 'W');
                place(node.steps[0]['AB'], 'B');
            }
            placevar(sgf);
            if (nvar) placevar(sgf.vars[nvar - 1]);
        };

        /**
         * Drops all the history.
         */

        Board.prototype.drop = function drop() {
            this.history = { added: [], hashes: [], changed: [] };
        };

        /**
         * Clones the board and without the history of moves.
         * It essentially creates a shallow copy of the board.
         */

        Board.prototype.fork = function fork() {
            let b = new Board(0);
            b.size = this.size;
            b.hash = this.hash;
            b.table = this.table.slice(0);
            b.blocks = this.blocks.slice(0);
            return b;
        };

        Board.prototype.get = function get(x, y) {
            if (y === void 0) {
                if (!tsumego.stone.hascoords(x)) return 0;

                var _tsumego$stone$coords = tsumego.stone.coords(x);

                x = _tsumego$stone$coords[0];
                y = _tsumego$stone$coords[1];
            }
            return this.blocks[this.getBlockId(x, y)];
        };

        Board.prototype.lift = function lift(id) {
            let bd;
            while (id && !block.size(bd = this.blocks[id])) id = block.libs(bd);
            return id;
        };

        /**
         * Returns block id or zero.
         * The block data can be read from blocks[id].
         */

        Board.prototype.getBlockId = function getBlockId(x, y) {
            return this.isInBounds(x, y) ? this.lift(this.table[y * this.size + x]) : 0;
        };

        /**
         * Returns the four neighbors of the stone
         * in the [L, R, T, B] format.
         */

        Board.prototype.getNbBlockIds = function getNbBlockIds(x, y) {
            return [this.getBlockId(x - 1, y), this.getBlockId(x + 1, y), this.getBlockId(x, y - 1), this.getBlockId(x, y + 1)];
        };

        /**
         * Adjusts libs of the four neighboring blocks
         * of the given color by the given quantity.
         */

        Board.prototype.adjust = function adjust(x, y, color, quantity) {
            let neighbors = this.getNbBlockIds(x, y);
            next: for (let i = 0; i < 4; i++) {
                let id = neighbors[i];
                let bd = this.blocks[id];
                if (bd * color <= 0) continue;
                for (let j = 0; j < i; j++) if (neighbors[j] == id) continue next;
                this.change(id, bd + quantity * block.lib1);
            }
        };

        /**
         * emoves ablock from the board and adjusts
         * the number of liberties of affected blocks.
         */

        Board.prototype.remove = function remove(id) {
            let bd = this.blocks[id];
            let hasht = bd > 0 ? hashtb : hashtw;

            var _block$dims = block.dims(bd);

            let xmin = _block$dims[0];
            let xmax = _block$dims[1];
            let ymin = _block$dims[2];
            let ymax = _block$dims[3];

            for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) if (this.getBlockId(x, y) == id) this.hash ^= hasht[y * this.size + x], this.adjust(x, y, -bd, +1);
            this.change(id, 0);
        };

        /**
         * Changes the block descriptor and makes
         * an appropriate record in the history.
         */

        Board.prototype.change = function change(id, bd) {
            // adding a new block corresponds to a change from
            // blocks[blocks.length - 1] -> b
            this.history.changed.push(id, this.blocks[id] | 0);
            this.blocks[id] = bd;
        };

        Board.prototype.inBounds = function inBounds(x, y) {
            if (y === void 0) {
                if (!tsumego.stone.hascoords(x)) return false;

                var _tsumego$stone$coords2 = tsumego.stone.coords(x);

                x = _tsumego$stone$coords2[0];
                y = _tsumego$stone$coords2[1];
            }
            return this.isInBounds(x, y);
        };

        Board.prototype.isInBounds = function isInBounds(x, y) {
            let n = this.size;
            return x >= 0 && x < n && y >= 0 && y < n;
        };

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

        Board.prototype.play = function play(move) {
            let color = tsumego.stone.color(move);
            let x = tsumego.stone.x(move);
            let y = tsumego.stone.y(move);
            if (!color || !tsumego.stone.hascoords(move) || this.getBlockId(x, y)) return 0;
            let size = this.size;
            let hash = this.hash;
            let n_changed = this.history.changed.length / 2; // id1, bd1, id2, bd2, ...
            let ids = this.getNbBlockIds(x, y);
            let nbs = [0, 0, 0, 0];
            let lib = [0, 0, 0, 0];
            for (let i = 0; i < 4; i++) nbs[i] = this.blocks[ids[i]], lib[i] = block.libs(nbs[i]);
            // remove captured blocks           
            let result = 0;
            fstr: for (let i = 0; i < 4; i++) {
                for (let j = 0; j < i; j++)
                // check if that block is already removed
                if (ids[j] == ids[i]) continue fstr;
                if (lib[i] == 1 && color * nbs[i] < 0) {
                    this.remove(ids[i]);
                    result += block.size(nbs[i]);
                    // the removed block may have occupied
                    // several liberties of the stone
                    for (let j = 0; j < 4; j++) if (ids[j] == ids[i]) lib[j] = nbs[j] = 0;
                }
            }
            // if nothing has been captured...
            if (result == 0) {
                let isll =
                /* L */(nbs[0] * color < 0 || lib[0] == 1 || x == 0) && (
                /* R */nbs[1] * color < 0 || lib[1] == 1 || x == size - 1) && (
                /* T */nbs[2] * color < 0 || lib[2] == 1 || y == 0) && (
                /* B */nbs[3] * color < 0 || lib[3] == 1 || y == size - 1);
                // suicide is not allowed
                if (isll) return 0;
            }
            // take away a lib of every neighboring enemy group
            this.adjust(x, y, -color, -1);
            // new group id = min of neighboring group ids
            let id_new = this.blocks.length;
            let is_new = true;
            for (let i = 0; i < 4; i++) if (nbs[i] * color > 0 && ids[i] < id_new) id_new = ids[i], is_new = false;
            let id_old = this.table[y * size + x];
            this.table[y * size + x] = id_new;
            this.hash ^= (color > 0 ? hashtb : hashtw)[y * size + x];
            if (is_new) {
                // create a new block if the new stone has no neighbors
                let n =
                /* L */+(!nbs[0] && x > 0) +
                /* R */+(!nbs[1] && x < size - 1) +
                /* T */+(!nbs[2] && y > 0) +
                /* B */+(!nbs[3] && y < size - 1);
                this.change(id_new, block(x, x, y, y, n, 1, color));
            } else {
                // merge neighbors into one block
                let fids = [id_new];
                for (let i = 0; i < 4; i++) if (nbs[i] * color > 0 && ids[i] != id_new) fids.push(ids[i]);
                let size_new = 1;
                let xmin_new = x;
                let xmax_new = x;
                let ymin_new = y;
                let ymax_new = y;
                for (let i = 0; i < fids.length; i++) {
                    let id = fids[i];
                    let bd = this.blocks[id];
                    size_new += block.size(bd);

                    var _block$dims2 = block.dims(bd);

                    let xmin = _block$dims2[0];
                    let xmax = _block$dims2[1];
                    let ymin = _block$dims2[2];
                    let ymax = _block$dims2[3];

                    xmin_new = tsumego.min(xmin_new, xmin);
                    ymin_new = tsumego.min(ymin_new, ymin);
                    xmax_new = tsumego.max(xmax_new, xmax);
                    ymax_new = tsumego.max(ymax_new, ymax);
                    // make the merged block point to the new block
                    if (id != id_new) this.change(id, block(0, 0, 0, 0, id_new, 0, 0));
                }
                // libs need to be counted in the rectangle extended by 1 intersection
                let libs_new = 0;
                for (let y = tsumego.max(ymin_new - 1, 0); y <= tsumego.min(ymax_new + 1, this.size - 1); y++) {
                    for (let x = tsumego.max(xmin_new - 1, 0); x <= tsumego.min(xmax_new + 1, this.size - 1); x++) {
                        if (this.getBlockId(x, y)) continue;
                        let is_lib = this.getBlockId(x - 1, y) == id_new || this.getBlockId(x + 1, y) == id_new || this.getBlockId(x, y - 1) == id_new || this.getBlockId(x, y + 1) == id_new;
                        if (is_lib) libs_new++;
                    }
                }
                this.change(id_new, block(xmin_new, xmax_new, ymin_new, ymax_new, libs_new, size_new, color));
            }
            this.history.added.push(x | y << 4 | this.history.changed.length / 2 - n_changed << 8 | id_old << 16 | color & 0x80000000);
            this.history.hashes.push(hash);
            return result + 1;
        };

        /**
         * Reverts the last move by restoring the original
         * block id in table[y * size + x] and by reverting
         * original values of block descriptors.
         *
         * Returns the restored move or zero. The returned
         * move can be given to .play to redo the position.
         */

        Board.prototype.undo = function undo() {
            let move = this.history.added.pop();
            if (!move) return 0;
            let x = move & 15;
            let y = move >> 4 & 15;
            let c = move & 0x80000000;
            let n = move >> 8 & 255;
            let b = move >> 16 & 255;
            this.table[y * this.size + x] = b;
            this.hash = this.history.hashes.pop();
            for (let i = 0; i < n; i++) {
                let bd = this.history.changed.pop();
                let id = this.history.changed.pop();
                // when a new block is added, the corresponding
                // record in the history looks like changing
                // the last block from 0 to something;; to undo
                // this properly, the last element in the array
                // needs to be removed as well
                if (id == this.blocks.length - 1 && !bd) this.blocks.pop();else this.blocks[id] = bd;
            }
            return tsumego.stone(x, y, c || +1);
        };

        Board.prototype.toStringCompact = function toStringCompact() {
            let n = this.size;
            let h = '',
                len = 0;
            for (let y = 0; y < n; y++) {
                let rx = h.length;
                for (let x = 0; x < n; x++) {
                    let b = this.get(x, y);
                    h += b > 0 ? 'X' : b < 0 ? 'O' : '-';
                    if (b) len = rx = h.length;
                }
                h = h.slice(0, rx) + ';';
            }
            return n + 'x' + n + '(' + h.slice(0, len) + ')';
        };

        Board.prototype.toStringSGF = function toStringSGF() {
            var _this5 = this;

            let indent = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

            let take = function take(pf, fn) {
                let list = '';
                for (let y = 0; y < _this5.size; y++) for (let x = 0; x < _this5.size; x++) if (fn(_this5.get(x, y))) list += tsumego.stone.toString(tsumego.stone(x, y, +1)).slice(1);
                return list && indent + pf + list;
            };
            return '(;FF[4]SZ[' + this.size + ']' + take('AB', function (c) {
                return c > 0;
            }) + take('AW', function (c) {
                return c < 0;
            }) + ')';
        };

        Board.prototype.toStringTXT = function toStringTXT() {
            let mode = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

            let hideLabels = /L-/.test(mode);
            let showLibsNum = /R/.test(mode);
            let xmax = 0,
                ymax = 0,
                s = '';
            for (let x = 0; x < this.size; x++) for (let y = 0; y < this.size; y++) if (this.get(x, y)) xmax = tsumego.max(x, xmax), ymax = tsumego.max(y, ymax);
            if (!hideLabels) {
                s += '  ';
                for (let x = 0; x <= xmax; x++) s += ' ' + String.fromCharCode(0x41 + (x < 8 ? x : x + 1)); // skip I
            }
            for (let y = 0; y <= ymax; y++) {
                if (s) s += '\n';
                if (!hideLabels) {
                    let n = this.size - y + '';
                    s += n.length < 2 ? ' ' + n : n;
                    ;
                }
                for (let x = 0; x <= xmax; x++) {
                    let b = this.get(x, y);
                    s += ' ';
                    s += showLibsNum ? block.libs(b) : b > 0 ? 'X' : b < 0 ? 'O' : '-';
                }
            }
            return s;
        };

        Board.prototype.toString = function toString(mode) {
            return mode == 'SGF' ? this.toStringSGF() : this.toStringTXT(mode);
        };

        Board.prototype.stones = function* stones() {
            for (let x = 0; x < this.size; x++) {
                for (let y = 0; y < this.size; y++) {
                    let s = this.get(x, y);
                    if (s) yield tsumego.stone(x, y, s);
                }
            }
        };

        Board.prototype.path = function path() {
            let moves = [];
            let path = [];
            let move;
            while (move = this.undo()) moves.unshift(move);
            for (move of moves) {
                path.push(this.fork());
                this.play(move);
            }
        };

        return Board;
    })();

    tsumego.Board = Board;
})(tsumego || (tsumego = {}));
/// <reference path="rand.ts" />
var tsumego;
(function (tsumego) {
    var linalg;
    (function (linalg) {
        let from = function from(n, f) {
            let a = new Array(n);
            for (let i = 0; i < n; i++) a[i] = f(i);
            return a;
        };
        var vector;
        (function (vector) {
            vector.zero = function (n) {
                return from(n, function () {
                    return 0;
                });
            };
            vector.make = function (n, f) {
                return from(n, f);
            };
            vector.dot = function (u, v) {
                let s = 0;
                for (let i = 0; i < u.length; i++) s += u[i] * v[i];
                return s;
            };
            /** m[i][j] = u[i] * v[j] */
            vector.dyad = function (u, v) {
                return from(u.length, function (i) {
                    return from(v.length, function (j) {
                        return u[i] * v[j];
                    });
                });
            };
            /** w[i] = u[i] * v[i] */
            vector.dot2 = function (u, v) {
                return from(u.length, function (i) {
                    return u[i] * v[i];
                });
            };
            /** u + k * v */
            vector.sum = function (u, v) {
                let k = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
                return from(u.length, function (i) {
                    return u[i] + k * v[i];
                });
            };
        })(vector = linalg.vector || (linalg.vector = {}));
        var matrix;
        (function (matrix) {
            matrix.zero = function (rows, cols) {
                return from(rows, function () {
                    return vector.zero(cols);
                });
            };
            matrix.make = function (rows, cols, f) {
                return from(rows, function (r) {
                    return vector.make(cols, function (c) {
                        return f(r, c);
                    });
                });
            };
            /** m * v */
            matrix.mulv = function (m, v) {
                return from(m.length, function (i) {
                    return vector.dot(m[i], v);
                });
            };
            /** a + k * b */
            matrix.sum = function (a, b) {
                let k = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
                return from(a.length, function (i) {
                    return vector.sum(a[i], b[i], k);
                });
            };
            matrix.transpose = function (m) {
                return from(m[0].length, function (i) {
                    return from(m.length, function (j) {
                        return m[j][i];
                    });
                });
            };
        })(matrix = linalg.matrix || (linalg.matrix = {}));

        let BitMatrix = (function () {
            function BitMatrix(rows, cols, init) {
                _classCallCheck(this, BitMatrix);

                this.rows = rows;
                this.cols = cols;
                this.bits = 0;
                if (typeof init === 'number') {
                    this.bits = init;
                } else if (typeof init === 'function') {
                    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) this.set(i, j, init(i, j));
                }
            }

            BitMatrix.prototype.toString = function toString() {
                let s = '';
                for (let i = 0; i < this.rows; i++, s += '|') for (let j = 0; j < this.cols; j++) s += this.get(i, j) ? '#' : '-';
                return s.slice(0, -1);
            };

            BitMatrix.prototype.get = function get(row, col) {
                let mask = this.mask(row, col);
                return !!(this.bits & mask);
            };

            BitMatrix.prototype.set = function set(row, col, bit) {
                let mask = this.mask(row, col);
                if (bit) this.bits |= mask;else this.bits &= ~mask;
            };

            /** transposition */

            BitMatrix.prototype.mask = function mask(row, col) {
                return 1 << row * this.cols + col;
            };

            _createClass(BitMatrix, [{
                key: 't',
                get: function get() {
                    var _this6 = this;

                    return new BitMatrix(this.cols, this.rows, function (i, j) {
                        return _this6.get(j, i);
                    });
                }

                /** counter clock wise rotation by 90 degrees */
            }, {
                key: 'r',
                get: function get() {
                    var _this7 = this;

                    return new BitMatrix(this.cols, this.rows, function (i, j) {
                        return _this7.get(j, _this7.cols - i - 1);
                    });
                }

                /** horizontal reflection */
            }, {
                key: 'h',
                get: function get() {
                    return this.r.t;
                }

                /** vertical reflection */
            }, {
                key: 'v',
                get: function get() {
                    return this.t.r;
                }
            }]);

            return BitMatrix;
        })();

        linalg.BitMatrix = BitMatrix;
    })(linalg = tsumego.linalg || (tsumego.linalg = {}));
})(tsumego || (tsumego = {}));
/// <reference path="board.ts" />
/// <reference path="linalg.ts" />
var tsumego;
(function (tsumego) {
    var BitMatrix = tsumego.linalg.BitMatrix;
    var Tags;
    (function (Tags) {
        Tags[Tags['X'] = 0] = 'X';
        Tags[Tags['O'] = 1] = 'O';
        Tags[Tags['-'] = 2] = '-';
        Tags[Tags['.'] = 3] = '.';
    })(Tags || (Tags = {}));
    let same = function same(m, b) {
        return (m.bits & b) === m.bits;
    };
    /**
     * An example of a pattern:
     *
     *      X X ?
     *      O . X
     *      - - -
     *
     *  `X` = a stone of the same color
     *  `O` = a stone of the opposite color
     *  `.` = an empty intersection
     *  `-` = a neutral stone (the wall)
     *  `?` = anything (doesn't matter what's on that intersection)
     */

    let Pattern = (function () {
        // the constructor can be very slow as every pattern
        // is constructed only once before the solver starts

        function Pattern(data) {
            _classCallCheck(this, Pattern);

            this.masks = [new Array()]; // 8 elements
            // m[0] = bits for X
            // m[1] = bits for O
            // m[2] = bits for -
            // m[3] = bits for .
            let m = this.masks;
            for (let i = 0; i < 4; i++) m[0].push(new BitMatrix(3, 3));
            for (let row = 0; row < data.length; row++) {
                for (let col = 0; col < data[row].length; col++) {
                    let tag = data[row].charAt(col).toUpperCase();
                    let mask = m[0][Tags[tag]];
                    if (mask) mask.set(row, col, true);
                }
            }
            // Now we need to come up with all sane transformations
            // of the given pattern: reflections, rotations and so on.
            // There are four such transformations:
            //
            //  T = transposition
            //  R = rotation by 90 degress counter clock wise
            //  H = horizontal reflection
            //  V = vertical reflection
            //
            // It can be noted that V = TR and H = RT which means that
            // T and R are enough to construct all the transformations.
            // Since RRRR = 1 (rotation by 360 degrees), the first four
            // patterns form a ring: m, Rm, RRm, RRRm. Applying T gives
            // the second ring: TRm, TRRm, TRRRm. Since TT = 1, it can
            // be easily proven that these 8 patterns form a closed group
            // over T and R operators.
            for (let i = 0; i < 3; i++) m.push(m[i].map(function (m) {
                return m.r;
            }));
            for (let i = 0; i < 4; i++) m.push(m[i].map(function (m) {
                return m.t;
            }));
        }

        Pattern.take = function take(board, x0, y0, color) {
            // constructing and disposing an array at every call
            // might look very inefficient, but getting rid of it
            // by declaring this array as a variable outside the
            // method doesn't improve performance at all in V8
            let m = [0, 0, 0, 0];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    let x = x0 + j - 1;
                    let y = y0 + i - 1;
                    let c = board.get(x, y);
                    let b = 1 << 3 * i + j;
                    if (c * color > 0) m[0] |= b; // a stone of the same color
                    else if (c * color < 0) m[1] |= b; // a stone of the opposite color
                        else if (!board.inBounds(x, y)) m[2] |= b; // a neutral stone (the wall)
                            else m[3] |= b; // a vacant intersection
                }
            }
            return m;
        };

        Pattern.prototype.test = function test(m) {
            search: for (let i = 0; i < 8; i++) {
                let w = this.masks[i];
                for (let j = 0; j < 4; j++) if (!same(w[j], m[j])) continue search;
                return true;
            }
            return false;
        };

        Pattern.isEye = function isEye(board, x, y, color) {
            let snapshot = Pattern.take(board, x, y, color);
            let patterns = Pattern.uceyes;
            // for..of would create an iterator and make
            // the function about 2x slower overall
            for (let i = 0; i < patterns.length; i++) if (patterns[i].test(snapshot)) return true;
            return false;
        };

        return Pattern;
    })();

    Pattern.uceyes = [new Pattern(['XXX', 'X.X', 'XXX']), new Pattern(['XX?', 'X.X', 'XXX']), new Pattern(['XXX', 'X.X', '---']), new Pattern(['XX-', 'X.-', '---'])];
    tsumego.Pattern = Pattern;
})(tsumego || (tsumego = {}));
var tsumego;
(function (tsumego) {
    var generators;
    (function (generators) {
        /** Basic moves generator. Tries to maximize libs. */
        function Basic(rzone) {
            let random = arguments.length <= 1 || arguments[1] === undefined ? tsumego.rand.LCG.NR01(Date.now()) : arguments[1];

            /** Defines the order in which the solver considers moves. */
            let sa = new tsumego.SortedArray(function (a, b) {
                return b.r - a.r || a.u - b.u || b.p - a.p || b.v - a.v || a.q - b.q || random() - 0.5;
            });
            return function (board, color) {
                let leafs = sa.reset();
                for (let move of rzone) {
                    var _tsumego$stone$coords3 = tsumego.stone.coords(move);

                    let x = _tsumego$stone$coords3[0];
                    let y = _tsumego$stone$coords3[1];

                    if (!tsumego.Pattern.isEye(board, x, y, color)) {
                        let s = tsumego.stone(x, y, color);
                        let r = board.play(s);
                        if (!r) continue;
                        // the three parameters can be easily packed
                        // in one 32 bit number, but packing and unpacking
                        // will only slow things down
                        sa.insert(s, {
                            r: r,
                            p: sumlibs(board, +color),
                            q: sumlibs(board, -color),
                            u: ninatari(board, +color),
                            v: ninatari(board, -color)
                        });
                        board.undo();
                    }
                }
                return leafs;
            };
        }
        generators.Basic = Basic;
    })(generators = tsumego.generators || (tsumego.generators = {}));
    function sumlibs(board, color) {
        let outer = 0;
        for (let i = 1; i < board.blocks.length; i++) {
            let b = board.blocks[i];
            if (tsumego.block.size(b) > 0 && b * color > 0) outer = outer ? tsumego.block.join(outer, b) : b;
        }

        var _tsumego$block$dims = tsumego.block.dims(outer);

        let xmin = _tsumego$block$dims[0];
        let xmax = _tsumego$block$dims[1];
        let ymin = _tsumego$block$dims[2];
        let ymax = _tsumego$block$dims[3];

        if (xmin > 0) xmin--;
        if (ymin > 0) ymin--;
        if (xmax < board.size - 1) xmax++;
        if (ymax < board.size - 1) ymax++;
        let total = 0;
        for (let x = xmin; x <= xmax; x++) {
            for (let y = ymin; y <= ymax; y++) {
                if (!board.get(x, y)) {
                    let isnb = board.get(x - 1, y) * color > 0 || board.get(x + 1, y) * color > 0 || board.get(x, y - 1) * color > 0 || board.get(x, y + 1) * color > 0;
                    if (isnb) total++;
                }
            }
        }
        return total;
    }
    tsumego.sumlibs = sumlibs;
    function ninatari(board, color) {
        let n = 0;
        for (let i = 1; i < board.blocks.length; i++) {
            let b = board.blocks[i];
            if (tsumego.block.size(b) > 0 && b * color > 0 && tsumego.block.libs(b) == 1) n++;
        }
        return n;
    }
    function eulern(board, color) {
        let q = arguments.length <= 2 || arguments[2] === undefined ? 2 : arguments[2];

        let n1 = 0,
            n2 = 0,
            n3 = 0;
        for (let x = -1; x <= board.size; x++) {
            for (let y = -1; y <= board.size; y++) {
                let a = +(board.get(x, y) * color > 0);
                let b = +(board.get(x + 1, y) * color > 0);
                let c = +(board.get(x + 1, y + 1) * color > 0);
                let d = +(board.get(x, y + 1) * color > 0);
                switch (a + b + c + d) {
                    case 1:
                        n1++;
                        break;
                    case 2:
                        if (a == c) n2++;
                        break;
                    case 3:
                        n3++;
                        break;
                }
            }
        }
        return (n1 - n3 + q * n2) / 4;
    }
})(tsumego || (tsumego = {}));
var tsumego;
(function (tsumego) {
    function entry(x, y, b, w, m) {
        return x | y << 4 | (b & 7) << 8 | (w & 7) << 11 | (m ? 0x8000 : 0);
    }
    var entry;
    (function (entry) {
        entry.get = function (s, color) {
            return (color > 0 ? s : s >> 16) & 0xFFFF;
        };
        entry.set = function (s, color, e) {
            return color > 0 ? s & ~0xFFFF | e : s & 0xFFFF | e << 16;
        };
        entry.x = function (e) {
            return e & 15;
        };
        entry.y = function (e) {
            return e >> 4 & 15;
        };
        entry.b = function (e) {
            return (e >> 8 & 7) << 29 >> 29;
        };
        entry.w = function (e) {
            return (e >> 11 & 7) << 29 >> 29;
        };
        entry.m = function (e) {
            return !!(e & 0x8000);
        };
    })(entry || (entry = {}));
    var entry;
    (function (entry) {
        let e = entry(0, 0, +3, -3, false);
        entry.base = e | e << 16;
    })(entry || (entry = {}));
    /** Transposition Table */

    let TT = (function () {
        function TT() {
            _classCallCheck(this, TT);

            this.size = 0;
            this.data = {};
        }

        TT.prototype.get = function get(hash, color, nkt) {
            let s = this.data[hash];
            if (!s) return 0;
            let e = entry.get(s, color);
            let winner = nkt >= entry.b(e) ? +1 : nkt <= entry.w(s) ? -1 : 0; // not solved for this number of ko treats
            if (!winner) return 0;
            // the move must be dropped if the outcome is a loss
            return winner * color > 0 && entry.m(e) ? tsumego.stone(entry.x(e), entry.y(e), winner) : tsumego.stone.nocoords(winner);
        };

        /**
         * @param color Who plays first.
         * @param move The outcome. Must have a color and may have coordinates.
         * @param nkt Must be within -2..+2 range.
         */

        TT.prototype.set = function set(hash, color, move, nkt) {
            if (nkt < -2 || nkt > +2 || !tsumego.stone.color(move)) throw SyntaxError('Invalid TT entry.');
            let s = this.data[hash] || ++this.size && entry.base;
            let e = entry.get(s, color);
            let hc = tsumego.stone.hascoords(move);
            let x = tsumego.stone.x(move);
            let y = tsumego.stone.y(move);
            let b = entry.b(e);
            let w = entry.w(e);
            if (move > 0 && nkt < b) e = entry(x, y, nkt, w, hc);else if (move < 0 && nkt > w) e = entry(x, y, b, nkt, hc);else return; // nothing to change in tt
            this.data[hash] = entry.set(s, color, e);
        };

        return TT;
    })();

    tsumego.TT = TT;
})(tsumego || (tsumego = {}));
/**
 * Implements the Benson's algorithm.
 *
 * Benson's Definition of Unconditional Life
 * http://senseis.xmp.net/?BensonsAlgorithm
 *
 * David B. Benson. "Life in the Game of Go"
 * http://webdocs.cs.ualberta.ca/~games/go/seminar/2002/020717/benson.pdf
 */
var tsumego;
(function (tsumego) {
    var benson;
    (function (benson) {
        /**
         * A chain of stones is said to be pass-alive or unconditionally alive
         * if the opponent cannot capture the chain even if the chain is not defended.
         *
         * In this implementation a chain is considered to be pass-alive if it has two eyes.
         * An eye is an adjacent region of either empty intersections or the opponent's
         * stones in which:
         *
         *  1. All empty intersections are adjacent to the chain.
         *  2. All chains adjacent to the region are also pass-alive.
         *
         * If the two requirements are met, the opponent cannot approach the chain from inside
         * the region and thus cannot capture the chain since there are two such regions.
         */
        function alive(b, root) {
            let path = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

            let chainId = b.get(root);
            let sameColor = function sameColor(s) {
                return b.get(s) * chainId > 0;
            };
            let visited = [];
            let nEyes = 0;
            // enumerate all liberties of the chain to find two eyes among those liberties
            search: for (let lib of tsumego.region(root, function (t, s) {
                return sameColor(s) && b.inBounds(t);
            })) {
                // the region(...) above enumerates stones in the chain and the liberties
                if (b.get(lib)) continue;
                // chains adjacent to the region
                let adjacent = [];
                let adjacentXY = [];
                for (let p of tsumego.region(lib, function (t, s) {
                    return !sameColor(t) && b.inBounds(t);
                })) {
                    // has this region been already marked as non vital to this chain?
                    if (visited[p]) continue search;
                    visited[p] = true;
                    let isAdjacent = false;
                    for (let q of tsumego.stone.neighbors(p)) {
                        let ch = b.get(q);
                        if (ch == chainId) {
                            isAdjacent = true;
                        } else if (ch * chainId > 0 && adjacent.indexOf(ch) < 0) {
                            adjacent.push(ch);
                            adjacentXY.push(q);
                        }
                    }
                    // is it an empty intersection that is not adjacent to the chain?
                    if (!b.get(p) && !isAdjacent) continue search;
                }
                // check that all adjacent chains are also alive
                for (let i = 0; i < adjacent.length; i++) {
                    let ch = adjacent[i];
                    // if a sequence of chains form a loop, they are all alive
                    if (path.indexOf(ch) < 0 && !alive(b, adjacentXY[i], [].concat(path, [ch]))) continue search;
                }
                if (++nEyes > 1) return true;
            }
            return false;
        }
        benson.alive = alive;
    })(benson = tsumego.benson || (tsumego.benson = {}));
})(tsumego || (tsumego = {}));
/// <reference path="linalg.ts" />
/**
 * Artificial Neural Networks.
 *
 * https://en.wikipedia.org/wiki/Backpropagation
 */
var tsumego;
(function (tsumego) {
    var ann;
    (function (ann) {
        var vector = tsumego.linalg.vector;
        var matrix = tsumego.linalg.matrix;
        let sigmoid0 = function sigmoid0(x) {
            return 1 / (1 + Math.exp(-x));
        }; // S(x) = 1/(1 + 1/e**x)
        let sigmoid1 = function sigmoid1(s) {
            return s * (1 - s);
        }; // d/dx S(x) = S(x) * (1 - S(x))
        /**
         * The simplest layered ANN.
         *
         * A layer v[i] is just a vector of numbers (called neurons) in 0..1 range.
         * The first layer v[0] is the input of the net.
         * The last layer v[n] is the output of the net.
         * Matrix w[i] (called neuron connections) connects v[i] and v[i + 1]
         * via the following equation: v[i + 1] = g(v[i] * w[i]), where g is the
         * so called activation function and is meant to keep all numbers in 0..1 range.
         * In other words, v[n] = F(w)(v[0]) where F(w) is the net function.
         * Training of the net is the process of computing F(w) for
         * different inputs and adjusting w to get closer to desired outputs.
         */

        let SimpleLayeredNetwork = (function () {
            function SimpleLayeredNetwork(size) {
                _classCallCheck(this, SimpleLayeredNetwork);

                this.weights = [];
                this.outputs = [vector.zero(size)];
            }

            /**
             * Adds a new layer and sets all connections as a matrix
             * with the latest layer. The size of the last layer must
             * match the number of columns in the matrix ad the size of
             * the new layer matches the number of rows.
             */

            SimpleLayeredNetwork.prototype.add = function add(layer) {
                let rand = arguments.length <= 1 || arguments[1] === undefined ? function () {
                    return Math.random();
                } : arguments[1];

                let v = this.outputs[this.outputs.length - 1];
                if (typeof layer === 'number') {
                    this.add(matrix.make(layer, v.length, function () {
                        return rand() / layer * 2;
                    }));
                } else {
                    this.weights.push(layer);
                    this.outputs.push(vector.zero(layer.length));
                }
            };

            /**
             * Values are propagated by a simple rule:
             *
             *      v[i + 1] = w[i] * v[i] | f where
             *
             *          [x1, x2, ...] | f = [f(x1), f(x2), ...]
             *          f(x) = 1/(1 + exp(-x))
             *          f' = f * (1 - f)
             *
             * f(x) is choosen to keep values in 0..1 range.
             */

            SimpleLayeredNetwork.prototype.apply = function apply(input) {
                let vs = this.outputs;
                let ws = this.weights;
                let n = ws.length;
                vs[0] = input;
                for (let i = 0; i < n; i++) vs[i + 1] = matrix.mulv(ws[i], vs[i]).map(sigmoid0); // vs[i+1] = ws[i]*vs[i] | f'
                return vs[n];
            };

            /**
             * This is the backpropagation algorithm which is quite simple.
             * If t is the desired output from v0, while the actual output is v[n],
             * we can adjust every w[i] by dw[i] to minimize E = (v[n] - t)^2/2. Since
             * gradient dE/dw points to the direction in which E increases, the opposite
             * direction reduces E, so we just need to find that gradient. The derivation
             * is quite simple and can be found in wikipedia. The final formulas are:
             *
             *      d[n] = (v[n] - t) : (v[n] | f') - this is d[n] for the last layer
             *      d[i] = (T(w[i]) * d[i + 1]) : (v[i] | f') - this is d[i] for the next layer
             *      dw[i] = -k * dE/dw = -k * dyad(d[i + 1], v[i]) - this is the adjustment
             *
             *      [x1, x2, ...] : [y1, y2, ...] = [x1*y1, x2*y2, ...]
             *      T(m) = transposition of m
             *      f' = f * (1 - f) which is true for f(x) = 1/(1 + exp(-x))
             *
             * So this algorithm starts with computing vector d[n] and then it goes back
             * one layer at a time to adjust w[i] and compute the next d[i].
             */

            SimpleLayeredNetwork.prototype.adjust = function adjust(target) {
                let k = arguments.length <= 1 || arguments[1] === undefined ? 1.0 : arguments[1];

                let vs = this.outputs;
                let ws = this.weights;
                let v0 = vs[vs.length - 1];
                // d[n] = (vs[n] - t) : (vs[n] | f')
                let d = vector.dot2(vector.sum(v0, target, -1), v0.map(sigmoid1));
                for (let i = ws.length - 1; i >= 0; i--) {
                    let w = ws[i];
                    let v = vs[i];
                    // dw[i] = -k * dyad(d[i + 1], v[i])
                    ws[i] = matrix.sum(w, vector.dyad(d, v), -k);
                    // d[i] = (w[i]^T * d[i + 1]) : (v[i] | f')
                    d = vector.dot2(matrix.mulv(matrix.transpose(w), d), v.map(sigmoid1));
                }
            };

            return SimpleLayeredNetwork;
        })();

        ann.SimpleLayeredNetwork = SimpleLayeredNetwork;
    })(ann = tsumego.ann || (tsumego.ann = {}));
})(tsumego || (tsumego = {}));
/**
 * The galois finite field GF(2**8) over 2**8 + 0x1b.
 *
 * en.wikipedia.org/wiki/Finite_field_arithmetic
 * www.cs.utsa.edu/~wagner/laws/FFM.html
 */
var tsumego;
(function (tsumego) {
    var gf8;
    (function (gf8) {
        let mul3 = function mul3(x) {
            return x ^ (x & 0x80 ? x << 1 ^ 0x11b : x << 1);
        }; // x * 3
        let exp3 = new Array(256); // exp3[x] = 3**x
        let log3 = new Array(256); // y = exp3[x], x = log3[y]
        for (let x = 0, y = 1; x < 256; x++, y = mul3(y)) log3[exp3[x] = y] = x;
        log3[1] = 0;
        let invt = log3.map(function (x) {
            return exp3[255 - x];
        }); // x * inv1[x] = 1
        let cut = function cut(x) {
            return x > 255 ? x - 255 : x;
        };
        gf8.mul = function (a, b) {
            return a && b && exp3[cut(log3[a] + log3[b])];
        };
        gf8.inv = function (a) {
            return invt[a];
        };
    })(gf8 = tsumego.gf8 || (tsumego.gf8 = {}));
})(tsumego || (tsumego = {}));
/**
 * The galois finite field GF(2**32) over 2**32 + 0x8d.
 * This implementation isn't fast, but simple.
 *
 * en.wikipedia.org/wiki/Primitive_root_modulo_n
 * en.wikibooks.org/wiki/Algorithm_Implementation/Mathematics/Extended_Euclidean_algorithm
 * search.cpan.org/~dmalone/Math-FastGF2-0.04/lib/Math/FastGF2.pm
 */
var tsumego;
(function (tsumego) {
    var gf32;
    (function (gf32) {
        let shl = function shl(x) {
            return x = x << 1 ^ (x < 0 ? 0x8d : 0);
        }; // x * 2 + 2**32 + 0x8d
        gf32.mul = function (a, b) {
            return b && (b & 1 ? a : 0) ^ shl(gf32.mul(a, b >>> 1));
        };
        let sqr = function sqr(x) {
            return gf32.mul(x, x);
        };
        let pow = function pow(a, b) {
            return !b ? 1 : gf32.mul(b & 1 ? a : 1, sqr(pow(a, b >>> 1)));
        }; // simpler than EGCD
        gf32.inv = function (x) {
            return pow(x, -2);
        }; // x**q = x (the little Fermat's theorem)
    })(gf32 = tsumego.gf32 || (tsumego.gf32 = {}));
})(tsumego || (tsumego = {}));
/// <reference path="pattern.ts" />
/// <reference path="movegen.ts" />
/// <reference path="tt.ts" />
/// <reference path="benson.ts" />
/// <reference path="benson.ts" />
/// <reference path="ann.ts" />
/// <reference path="gf2.ts" />
var tsumego;
(function (tsumego) {
    let infty = 255;
    var repd;
    (function (repd_1) {
        repd_1.get = function (move) {
            return move >> 8 & 255;
        };
        repd_1.set = function (move, repd) {
            return move & ~0xFF00 | repd << 8;
        };
    })(repd || (repd = {}));
    function solve(args) {
        let g = solve.start(args);
        let s = g.next();
        while (!s.done) s = g.next();
        return s.value;
    }
    tsumego.solve = solve;
    var solve;
    (function (solve_1) {
        function parse(data) {
            let sgf = tsumego.SGF.parse(data);
            if (!sgf) throw SyntaxError('Invalid SGF.');
            let errors = [];
            let exec = function exec(fn, em) {
                try {
                    return fn();
                } catch (e) {
                    errors.push(em || e && e.message);
                }
            };
            let board = exec(function () {
                return new tsumego.Board(sgf);
            });
            let color = exec(function () {
                return sgf.get('PL')[0] == 'W' ? -1 : +1;
            }, 'PL[W] or PL[B] must tell who plays first.');
            let rzone = exec(function () {
                return sgf.get('SQ').map(tsumego.stone.fromString);
            }, 'SQ[xy][..] must tell the set of possible moves.');
            let target = exec(function () {
                return tsumego.stone.fromString(sgf.get('MA')[0]);
            }, 'MA[xy] must specify the target white stone.');
            let komaster = exec(function () {
                return sgf.get('KM') + '' == 'W' ? -2 : +2;
            }, 'KM[W] or KM[B] must tell who is the ko master. This tag is optional.');
            if (errors.length) throw SyntaxError('The SGF does not correctly describe a tsumego:\n\t' + errors.join('\n\t'));
            return {
                root: board,
                color: color,
                nkt: komaster,
                expand: tsumego.generators.Basic(rzone),
                status: function status(b) {
                    return b.get(target) < 0 ? -1 : +1;
                },
                alive: function alive(b) {
                    return tsumego.benson.alive(b, target);
                }
            };
        }
        function* start(args) {
            var _ref = typeof args === 'string' ? parse(args) : args;

            let board = _ref.root;
            let color = _ref.color;
            var _ref$nkt = _ref.nkt;
            let nkt = _ref$nkt === undefined ? 0 : _ref$nkt;
            var _ref$tt = _ref.tt;
            let tt = _ref$tt === undefined ? new tsumego.TT() : _ref$tt;
            let expand = _ref.expand;
            let status = _ref.status;
            let alive = _ref.alive;
            let stats = _ref.stats;
            let debug = _ref.debug;

            // cache results from static analysis as it's quite slow
            alive = tsumego.memoized(alive, function (board) {
                return board.hash;
            });
            /** Moves that require a ko treat are considered last.
                That's not just perf optimization: the search depends on this. */
            let sa = new tsumego.SortedArray(function (a, b) {
                return b.d - a.d || b.w - a.w;
            }); // first consider moves that lead to a winning position
            let path = []; // path[i] = hash of the i-th position
            let tags = []; // tags[i] = hash of the path to the i-th position
            function* solve(color, nkt) {
                let depth = path.length;
                let prevb = depth < 1 ? 0 : path[depth - 1];
                let hashb = board.hash;
                let ttres = tt.get(hashb, color, nkt);
                stats && (stats.depth = depth, yield);
                if (ttres) {
                    debug && (yield 'reusing cached solution: ' + tsumego.stone.toString(ttres));
                    return repd.set(ttres, infty);
                }
                let result;
                let mindepth = infty;
                let nodes = sa.reset();
                for (let move of expand(board, color)) {
                    board.play(move);
                    let hash = board.hash;
                    board.undo();
                    let d = depth - 1;
                    while (d >= 0 && path[d] != hash) d = d > 0 && path[d] == path[d - 1] ? -1 : d - 1;
                    d++;
                    if (!d) d = infty;
                    if (d < mindepth) mindepth = d;
                    // there are no ko treats to play this move,
                    // so play a random move elsewhere and yield
                    // the turn to the opponent; this is needed
                    // if the opponent is playing useless ko-like
                    // moves that do not help even if all these
                    // ko fights are won
                    if (d <= depth && nkt * color <= 0) continue;
                    // check if this node has already been solved
                    let r = tt.get(hash, -color, d <= depth ? nkt - color : nkt);
                    sa.insert(repd.set(move, d), {
                        d: d,
                        w: tsumego.stone.color(r) * color
                    });
                }
                // Consider making a pass as well. Passing locally is like
                // playing a move elsewhere and yielding the turn to the
                // opponent locally: it doesn't affect the local position,
                // but resets the local history of moves. This is why passing
                // may be useful: a position may be unsolvable with the given
                // history of moves, but once it's reset, the position can be
                // solved despite the move is yilded to the opponent.
                sa.insert(0, { d: infty, w: 0 });
                for (let move of nodes) {
                    let d = !move ? infty : repd.get(move);
                    let s;
                    // this is a hash of the path: reordering moves must change the hash;
                    // 0x87654321 is meant to be a generator of the field, but I didn't
                    // know how to find such a generator, so I just checked that first
                    // million powers of this element are unique
                    let h = tsumego.gf32.mul(prevb != hashb ? prevb : 0, 0x87654321) ^ hashb;
                    tags.push(h & ~15 | (nkt & 7) << 1 | (color < 0 ? 1 : 0));
                    path.push(hashb);
                    stats && stats.nodes++;
                    if (!move) {
                        debug && (yield 'yielding the turn to the opponent');
                        let i = tags.lastIndexOf(tags[depth], -2);
                        if (i >= 0) {
                            // yielding the turn again means that both sides agreed on
                            // the group's status; check the target's status and quit
                            s = repd.set(tsumego.stone.nocoords(status(board)), i + 1);
                        } else {
                            // play a random move elsewhere and yield
                            // the turn to the opponent; playing a move
                            // elsewhere resets the local history of moves
                            s = yield* solve(-color, nkt);
                        }
                    } else {
                        board.play(move);
                        debug && (yield);
                        s = status(board) > 0 ? repd.set(tsumego.stone.nocoords(+1), infty) :
                        // white has secured the group: black cannot
                        // capture it no matter how well it plays
                        color < 0 && alive && alive(board) ? repd.set(tsumego.stone.nocoords(-1), infty) :
                        // let the opponent play the best move
                        d > depth ? (yield* solve(-color, nkt)) : (
                        // this move repeat a previously played position:
                        // spend a ko treat and yield the turn to the opponent
                        debug && (yield 'spending a ko treat'), yield* solve(-color, nkt - color));
                        board.undo();
                    }
                    debug && (yield 'the outcome of this move: ' + tsumego.stone.toString(s));
                    path.pop();
                    tags.pop();
                    // the min value of repd is counted only for the case
                    // if all moves result in a loss; if this happens, then
                    // the current player can say that the loss was caused
                    // by the absence of ko treats and point to the earliest
                    // repetition in the path
                    if (s * color < 0 && move) mindepth = tsumego.min(mindepth, d > depth ? repd.get(s) : d);
                    // the winning move may depend on a repetition, while
                    // there can be another move that gives the same result
                    // uncondtiionally, so it might make sense to continue
                    // searching in such cases
                    if (s * color > 0) {
                        // if the board b was reached via path p has a winning
                        // move m that required to spend a ko treat and now b
                        // is reached via path q with at least one ko treat left,
                        // that ko treat can be spent to play m if it appears in q
                        // and then win the position again; this is why such moves
                        // are stored as unconditional (repd = infty)
                        result = repd.set(move || tsumego.stone.nocoords(color), d > depth && move ? repd.get(s) : d);
                        break;
                    }
                }
                // if there is no winning move, record a loss
                if (!result) result = repd.set(tsumego.stone.nocoords(-color), mindepth);
                // if the solution doesn't depend on a ko above the current node,
                // it can be stored and later used unconditionally as it doesn't
                // depend on a path that leads to the node; this stands true if all
                // such solutions are stored and never removed from the table; this
                // can be proved by trying to construct a path from a node in the
                // proof tree to the root node
                if (repd.get(result) > depth + 1) tt.set(hashb, color, result, nkt);
                return result;
            }
            let moves = [];
            let move;
            while (move = board.undo()) moves.unshift(move);
            for (move of moves) {
                path.push(board.hash);
                board.play(move);
            }
            move = yield* solve(color, nkt);
            return typeof args === 'string' ? tsumego.stone.toString(move) : move;
        }
        solve_1.start = start;
    })(solve = tsumego.solve || (tsumego.solve = {}));
})(tsumego || (tsumego = {}));
//# sourceMappingURL=sample\tsumego.es6.js.map