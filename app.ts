/// <reference path="kb.ts" />
/// <reference path="xhr.ts" />
/// <reference path="src/solver.ts" />
/// <reference path="eidogo/eidogo.d.ts" />

module testbench {
    import Board = tsumego.Board;

    declare var egp: eidogo.Player;

    const xy2s = (m: Coords) => m ? String.fromCharCode(0x41 + m.x) + (m.y + 1) : 'null';
    const c2s = Color.alias;
    const cm2s = (c: Color, m: Coords) => c2s(c) + (m ? ' plays at ' + xy2s(m) : ' passes');
    const cw2s = (c: Color, m: Coords) => c2s(c) + ' wins by ' + (m ? xy2s(m) : 'passing');

    /** { x: 2, y: 3 } -> `cd` */
    const xy2f = (xy: Coords) => n2s(xy.x) + n2s(xy.y);

    /** -1, { x: 2, y: 3 } -> `W[cd]` */
    const xyc2f = (c: Color, xy: Coords) => (c > 0 ? 'B' : 'W') + '[' + xy2f(xy) + ']';

    /** `cd` -> { x: 2, y: 3 } */
    const f2xy = (s: string) => <Coords>{ x: s2n(s, 0), y: s2n(s, 1) };

    function parseSGF(source: string): [Board, Coords[], Coords] {
        const brd = new Board(source);
        const sgf = SGF.parse(source);
        const setup = sgf.steps[0];
        const aim = f2xy(setup['MA'][0]);
        const rzn = setup['DD'].map(f2xy);
        return [brd, rzn, aim];
    }

    function s2s(c: Color, s: Result) {
        let isDraw = s.color == 0;
        let isLoss = s.color * c < 0;

        return c2s(c) + ' ' + (isLoss ? 'loses' : (isDraw ? 'draws' : 'wins') + ' with ' + xy2s(s.move));
    }

    /** shared transposition table for black and white */
    const tt = new tsumego.TT;

    function solve(path: Board[], color: Color, nkotreats: number = 0, log = false) {
        let t0 = +new Date;

        const solver = new tsumego.Solver(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1);

        const { tag: t } = solver.current;
        while (!t.res)
            solver.next();
        const rs = t.res;

        let t1 = +new Date;

        if (log) {
            console.log('solved in', ((t1 - t0) / 1000).toFixed(2), 'seconds');
            console.log(s2s(color, rs));
            console.log('tt:', Object.keys(tt).length);
        }

        return rs;
    }

    class CancellationToken {
        cancelled = false;
    }

    function sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    function dbgsolve(path: Board[], color: Color, nkotreats: number = 0, stopat?: number) {
        let log = true;

        const player: tsumego.Player = {
            play: (color, move) => {
                if (!log) return;
                egp.currentColor = color > 0 ? 'B' : 'W';

                if (move)
                    egp.createMove(xy2f(move));
                else
                    egp.pass();
            },
            undo: () => {
                if (!log) return;
                egp.back();
            },
            done: (color, move, note) => {
                if (!log) return;
                egp.unsavedChanges = true;
                egp.cursor.node.C = `${egp.cursor.node.C || ''} ${cw2s(color, move) } ${note ? '(' + note + ')' : ''}\n`;
                egp.refresh();
            },
            loss: (color, move, response) => {
                if (!log) return;
                egp.unsavedChanges = true;
                egp.cursor.node.C = `${egp.cursor.node.C || ''} if ${cm2s(color, move) }, then ${cw2s(-color, response) }\n`;
                egp.refresh();
            }
        };

        const solver = new tsumego.Solver(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1, player);

        window['solver'] = solver;

        let tick = 0;

        const next = () => {
            solver.next();
            tick++;

            if (log) {
                const bp = ';bp=' + tick;
                const rx = /;bp=\d+/;

                location.href = rx.test(location.hash) ?
                    location.href.replace(rx, bp) :
                    location.href + bp;
            }
        };

        const stepOver = (ct: CancellationToken) => {
            const {tag: t, node: b} = solver.current;
            log = false;

            return new Promise((resolve, reject) => {
                while (!t.res) {
                    next();

                    if (ct.cancelled)
                        return void reject();
                }

                resolve();
            }).then(() => {
                log = true;
                console.log(s2s(t.color, t.res) + ':\n' + b);
                next();
            });
        };

        const stepOut = () => {
            log = false;
            const n = solver.depth;
            while (solver.depth >= n)
                next();
            log = true;
            renderSGF(solver.current.node.toString('SGF'));
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
            'Shift+F11 - step out\n');

        if (stopat > 0) {
            setTimeout(() => {
                console.log('skipping first', stopat, 'steps...');
                log = false;
                while (tick < stopat)
                    next();
                log = true;
                renderSGF(solver.current.node.toString('SGF'));
            }, 100);
        }
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

    var board: Board, rzone: Coords[], aim, path: Board[];

    const source = location.search.slice(1);
    let sgfdata = '';

    (source.slice(0, 1) == '(' ? Promise.resolve(source) : send('GET', '/problems/' + source + '.sgf')).then(res => {
        [board, rzone, aim] = parseSGF(res);
        path = [board.fork()];
        console.log(res);
        sgfdata = res;
        console.log('\n\n' + board.hash() + '\n\n' + board);
        document.title = source;
        renderSGF(res);

        try {
            const [, bw, nkt, bp] = /^#(B|W)([+-]\d+)(?:;bp=(\d+))?$/.exec(location.hash);

            dbgsolve(path, bw == 'W' ? -1 : +1, +nkt, +bp);
        } catch (_) {
            console.log(_);
        }
    }).catch(err => {
        console.error(err);
    });

    function renderSGF(sgf: string) {
        egp = new eidogo.Player({
            container: 'board',
            theme: 'standard',
            sgf: sgf, // EidoGo cannot display 8x8 boards
            mode: 'play', // "play" or "view"
            //shrinkToFit: true,
            showComments: true,
            showPlayerInfo: false,
            showGameInfo: true,
            showTools: true,
            showOptions: true,
            markCurrent: true,
            markVariations: true,
            markNext: true,
            enableShortcuts: false,
            showNavTree: true,
            problemMode: false
        });
    }

    function parse(si: string): Coords {
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
