/// <reference path="xhr.ts" />
/// <reference path="src/solver.ts" />
/// <reference path="eidogo/eidogo.d.ts" />

interface Element {
    onclick: (ev: MouseEvent) => any;
}

module testbench {
    import Board = tsumego.Board;

    declare var egp: eidogo.Player;

    const x2s = (x: number) => String.fromCharCode(0x61 + x);
    const y2s = (y: number) => x2s(y);
    const xy2s = (xy: Coords) => x2s(xy.x) + y2s(xy.y);
    const c2s = (c: Color) => c > 0 ? 'X' : 'O';

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

    function solve(path: Board[], color: Color, nkotreats: number = 0, debug = false) {
        let t0 = +new Date;

        const player: tsumego.Player = {
            play: (x, y, c) => egp.createMove(xy2f({ x: x, y: y })),
            pass: (c) => egp.pass(),
            undo: (x, y, c) => egp.back()
        };

        const solver = new tsumego.Solver(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1, debug && player);

        let rs, ts: Result;

        if (!debug)
            while (ts = solver.next()) rs = ts;
        else {
            document.onkeydown = event => {
                if (event.which == 39) {
                    const r = solver.next();
                    console.log('.next()', '->', r);
                }
            };
        }

        let t1 = +new Date;

        if (debug) {
            console.log('solved in', ((t1 - t0) / 1000).toFixed(2), 'seconds');
            console.log(s2s(color, rs));
            console.log('tt:', Object.keys(tt).length);
        }

        return rs;
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

    (source.slice(0, 1) == '(' ?
        Promise.resolve(source) :
        send('GET', '/problems/' + source + '.sgf')).then(res => {
        [board, rzone, aim] = parseSGF(res);
        path = [board.fork()];
        console.log(res);
        sgfdata = res;
        console.log('\n\n' + board.hash() + '\n\n' + board);
        document.title = source;
        renderSGF(res);
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
                    const {move} = solve(path, c, !xy ? 0 : +xy, location.hash == '#debug');

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
