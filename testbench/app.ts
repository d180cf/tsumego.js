/// <reference path="kb.ts" />
/// <reference path="xhr.ts" />
/// <reference path="../src/solver.ts" />
/// <reference path="wgo/wgo.d.ts" />

module testbench {
    import n2s = tsumego.n2s;
    import s2n = tsumego.s2n;
    import Result = tsumego.Result;
    import Color = tsumego.Color;
    import Move = tsumego.XY;
    import Board = tsumego.Board;

    var goban: WGo.BasicPlayer = null;

    /** In SGF a B stone at x = 8, y = 2
        is written as B[ic] on a 9x9 goban
        it corresponds to J7 - the I letter
        is skipped and the y coordinate is
        counted from the bottom starting from 1. */
    const xy2s = (m: Move) => !m ? 'null' :
        String.fromCharCode(0x41 + (m.x > 7 ? m.x - 1 : m.x)) +
        (goban.board.size - m.y);

    const c2s = Color.alias;
    const cm2s = (c: Color, m: Move) => c2s(c) + (m ? ' plays at ' + xy2s(m) : ' passes');
    const cw2s = (c: Color, m: Move) => c2s(c) + ' wins by ' + (m ? xy2s(m) : 'passing');

    /** { x: 2, y: 3 } -> `cd` */
    const xy2f = (xy: Move) => n2s(xy.x) + n2s(xy.y);

    /** -1, { x: 2, y: 3 } -> `W[cd]` */
    const xyc2f = (c: Color, xy: Move) => (c > 0 ? 'B' : 'W') + '[' + xy2f(xy) + ']';

    /** `cd` -> { x: 2, y: 3 } */
    const f2xy = (s: string) => <Move>{ x: s2n(s, 0), y: s2n(s, 1) };

    function parseSGF(source: string): [Board, Move[], Move] {
        const brd = new Board(source);
        const sgf = SGF.parse(source);
        const setup = sgf.steps[0];
        const aim = f2xy(setup['MA'][0]);
        const rzn = setup['DD'].map(f2xy);
        return [brd, rzn, aim];
    }

    function s2s(c: Color, s: Result<Move>) {
        let isDraw = s.color == 0;
        let isLoss = s.color * c < 0;

        return c2s(c) + ' ' + (isLoss ? 'loses' : (isDraw ? 'draws' : 'wins') + ' with ' + xy2s(s.move));
    }

    /** shared transposition table for black and white */
    var tt = new tsumego.TT<Move>();

    function solve(path: Board[], color: Color, nkotreats: number = 0, log = false) {
        let t0 = +new Date;

        const rs = tsumego.solve(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1);

        let t1 = +new Date;

        if (log) {
            console.log('solved in', ((t1 - t0) / 1000).toFixed(2), 'seconds');
            console.log(s2s(color, rs));
        }

        return rs;
    }

    class CancellationToken {
        cancelled = false;
    }

    function sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    function dbgsolve(path: Board[], color: Color, nkotreats: number = 0) {
        let log = true;

        const player: tsumego.Player<Move> = {
            play: (color, move) => {
                if (!log) return;

                const node = new WGo.KNode({
                    _edited: true,
                    move: {
                        pass: !move,
                        x: move && move.x,
                        y: move && move.y,
                        c: color > 0 ? WGo.B : WGo.W
                    }
                });

                goban.kifuReader.node.appendChild(node);
                goban.next(goban.kifuReader.node.children.length - 1);
            },
            undo: () => {
                if (!log) return;
                goban.previous();
            },
            done: (color, move, note) => {
                if (!log) return;
                const comment = `${cw2s(color, move) } ${note ? '(' + note + ')' : ''}\n`;
                const node = goban.kifuReader.node;
                node.comment = node.comment || '';
                node.comment += comment;
                goban.update();
            },
            loss: (color, move, response) => {
                if (!log) return;
                const comment = `if ${cm2s(color, move) }, then ${cw2s(-color, response) }\n`;
                const node = goban.kifuReader.node;
                node.comment = node.comment || '';
                node.comment += comment;
                goban.update();
            }
        };

        const solver = tsumego._solve(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1, player);

        window['solver'] = solver;

        let tick = 0;
        let board: Board;
        let result: Result<Move>;

        const next = () => {
            const {done, value} = solver.next();
            tick++;
            board = path[path.length - 1];
            result = value;

            if (log) {
                const bp = ';bp=' + tick;
                const rx = /;bp=\d+/;

                location.href = rx.test(location.hash) ?
                    location.href.replace(rx, bp) :
                    location.href + bp;
            }
        };

        const stepOver = (ct: CancellationToken) => {
            const b = board;

            return new Promise((resolve, reject) => {
                while (!result || !board || b.hash() != board.hash()) {
                    next();

                    if (ct.cancelled)
                        return void reject();
                }

                resolve();
            }).then(() => {
                //console.log(s2s(color, result) + ':\n' + b);
                next();
            });
        };

        const stepOut = () => {
            /*
            log = false;
            const n = solver.depth;
            while (solver.depth >= n)
                next();
            log = true;
            renderSGF(solver.current.node.toString('SGF'));
            */
        };

        keyboard.hook(keyboard.Key.F10, event => {
            event.preventDefault();
            const ct = new CancellationToken;
            const hook = keyboard.hook(keyboard.Key.Esc, event => {
                event.preventDefault();
                console.log('cancelling...');
                ct.cancelled = true;
            });

            stepOver(ct).catch().then(() => hook.dispose());
        });

        keyboard.hook(keyboard.Key.F11, event => {
            if (!event.shiftKey) {
                event.preventDefault();
                if (event.ctrlKey)
                    debugger;
                next();
            } else {
                // Shift+F11
                event.preventDefault();
                stepOut();
            }
        });

        console.log('debug mode:', c2s(color), 'to play with', nkotreats, 'external ko treats\n',
            'F11 - step into\n',
            'Ctrl+F11 - step into and debug\n',
            'F10 - step over\n',
            'Shift+F11 - step out\n',
            'G - go to a certain step\n');

        keyboard.hook('G'.charCodeAt(0), event => {
            event.preventDefault();
            const stopat = +prompt('Step #:');
            if (!stopat) return;
            console.log('skipping first', stopat, 'steps...');
            while (tick < stopat)
                next();
            renderSGF(board.toString('SGF'));
        });
    }

    /** Constructs the proof tree in the SGF format.
        The tree's root is a winning move and its
        branches are all possible answers of the opponent. */
    function proof(path: Board[], color: Color, nkt = 0, depth = 0) {
        const {move} = solve(path, color, nkt);
        if (!move)
            return null;

        const b = path[path.length - 1].fork();
        if (!b.play(move.x, move.y, color)) {
            debugger;
            throw new Error('Impossible move: ' + xy2s(move));
        }

        // check for repetitions
        let d = path.length - 1;
        while (d >= 0 && path[d].hash() != b.hash())
            d--;

        // check if -color can make this move
        if (d >= 0) {
            if (color * nkt > 0)
                nkt -= color;
            else {
                debugger;
                throw new Error('The play doesnt have ko treats for this repetition.');
            }
        }

        let vars = '';

        if (b.at(aim.x, aim.y)) {
            for (const m of rzone) {
                const bm = b.fork();
                if (!bm.play(m.x, m.y, -color))
                    continue;

                // check for repetitions
                let d = path.length - 1;
                while (d >= 0 && path[d].hash() != bm.hash())
                    d--;

                // check if -color can make this move
                if (d >= 0) {
                    if (color * nkt < 0)
                        nkt += color;
                    else
                        continue;
                }

                path.push(bm);
                const p = proof(path, color, nkt, depth + 1);
                path.pop();

                if (p)
                    vars += '\n ' + '  '['repeat'](depth + 1) + '(;' + xyc2f(-color, m) + p + ')';
            }
        }

        return ';' + xyc2f(color, move) + vars;
    }

    var board: Board, rzone: Move[], aim, path: Board[];

    const source = location.search.slice(1);
    let sgfdata = '';

    (source.slice(0, 1) == '(' ? Promise.resolve(source) : send('GET', '/problems/' + source + '.sgf')).then(res => {
        [board, rzone, aim] = parseSGF(res);
        path = [board.fork()];
        console.log(res);
        sgfdata = res;
        console.log('\n\n' + board.hash() + '\n\n' + board);
        document.title = source;
        setTimeout(() => renderSGF(res));

        try {
            const [, bw, nkt] = /^#(B|W)([+-]\d+)/.exec(location.hash);
            dbgsolve(path, bw == 'W' ? -1 : +1, +nkt);
        } catch (_) {
            console.log(_);
        }
    }).catch(err => {
        console.error(err);
    });

    function renderSGF(sgf: string) {
        goban = new WGo.BasicPlayer(document.body, {
            // a dummy C{...] tag is needed to
            // enable the comment box in wgo
            sgf: sgf.replace(/\)\s*$/, 'C[ ])')
        });

        goban.setCoordinates(true);
        goban.kifuReader.allowIllegalMoves(true);
    }

    function parse(si: string): Move {
        return {
            x: si.charCodeAt(0) - 65,
            y: +/\d+/.exec(si)[0] - 1
        };
    }

    window['$'] = data => {
        const cmd = data.toString().trim().split(' ');
        const col = cmd[0].toLowerCase();

        switch (col) {
            case 'x':
            case 'o':
                var xy = cmd[1] && cmd[1].toUpperCase();
                var b = path[path.length - 1].fork();
                var c = cmd[0].toUpperCase() == 'O' ? -1 : +1;

                if (/^[a-z]\d+$/i.test(xy)) {
                    var p = parse(xy);

                    if (!b.play(p.x, p.y, c)) {
                        console.log(col, 'cannot play at', xy);
                    } else {
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + b);
                    }
                } else {
                    const {move} = solve(path, c, !xy ? 0 : +xy, true);

                    if (!move) {
                        console.log(col, 'passes');
                    } else {
                        const sgfp = sgfdata.replace(
                            /\)\s*$/,
                            '\n\n (' + proof(path, c, !xy ? 0 : +xy) + '))');

                        b.play(move.x, move.y, c);
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + b);
                        renderSGF(sgfp);
                    }
                }
                break;
            case 'undo':
                if (path.length > 1) {
                    for (let n = +(cmd[1] || 1); n > 0 && path.length > 1; n--) {
                        path.pop();
                        board = path[path.length - 1];
                    }
                    console.log('\n\n' + board.hash() + '\n\n' + board);
                } else {
                    console.log('nothing to undo');
                }
                break;
            case 'path':
                for (let b of path)
                    console.log('\n\n' + b.hash() + '\n\n' + b);
                break;
            default:
                console.log('unknown command');
        }
    };
}
