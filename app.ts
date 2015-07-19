/// <reference path="xhr.ts" />
/// <reference path="src/solver.ts" />
/// <reference path="eidogo/eidogo.d.ts" />

module testbench {
    import Board = tsumego.Board;

    declare var egp: eidogo.Player;

    const xy2s = ({x, y}: Coords) => String.fromCharCode(0x41 + x) + (y + 1);
    const c2s = (c: Color) => c > 0 ? 'B' : 'W';

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

        const t = solver.current;
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

    function dbgsolve(path: Board[], color: Color, nkotreats: number = 0, stopat?: number) {
        let log = true;

        const player: tsumego.Player = {
            play: (x, y, c) => {
                if (!log) return;
                egp.currentColor = c > 0 ? 'B' : 'W';
                egp.createMove(xy2f({ x: x, y: y }));
            },
            pass: (c) => {
                if (!log) return;
                egp.pass();
            },
            undo: (x, y, c) => {
                if (!log) return;
                egp.unsavedChanges = true;
                egp.cursor.node.C = c2s(c) + ' wins by ' + xy2s({ x: x, y: y });
                egp.refresh();
                egp.back();
            }
        };

        const solver = new tsumego.Solver(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1, player);

        window['solver'] = solver;

        const root = solver.current;
        let tick = 0;

        const next = () => {
            if (root.res)
                throw Error('Already solved.');
            solver.next();
            tick++;
            document.title = 'tick: ' + tick;
        };

        const stepOver = () => {
            const b = solver.path[solver.depth - 1];
            const t = solver.current;
            log = false;
            while (!t.res)
                next();
            log = true;
            console.log(s2s(t.color, t.res) + ':\n' + b);
            next();
        };

        const stepOut = () => {
            const n = solver.depth;
            while (solver.depth >= n)
                next();
        };

        document.onkeydown = event => {
            switch (event.which) {
                case 121: // F10
                    event.preventDefault();
                    stepOver();
                    break;
                case 122: // F11
                    if (!event.shiftKey) {
                        event.preventDefault();
                        next();
                    } else {
                        // Shift+F11
                        event.preventDefault();
                        stepOut();
                    }
                    break;
            }
        };

        console.log('debug mode:', c2s(color), 'to play with', nkotreats, 'external ko treats\n',
            'F11 - step into\n',
            'F10 - step over\n',
            'Shift+F11 - step out\n');

        if (stopat > 0) {
            console.log('skipping first', stopat, 'steps...');
            while (stopat > 0) {
                next();
                stopat--;
            }
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
            // ignore
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
