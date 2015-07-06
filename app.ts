/// <reference path="xhr.ts" />
/// <reference path="src/solver.ts" />

module testbench {
    import Board = tsumego.Board;

    declare const eidogo: any;

    function parseSGF(source: string): [Board, XYIndex[], XYIndex] {
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
    const tt: Cache = {};

    function solve(path: Board[], color: Color, nkotreats: number = 0, stats = true) {
        let t0 = +new Date;

        let rs = tsumego.solve(path, color, nkotreats, rzone, aim, tt,
            tsumego.generators.basic,
            b => b.at(aim.x, aim.y) < 0 ? -1 : +1);

        let t1 = +new Date;

        if (stats) {
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
        const {move} = solve(path, color, nkt, false);
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

    var board: Board, rzone: XYIndex[], aim, path: Board[];

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
        window['egp'] = new eidogo.Player({
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
                    const {move} = solve(path, c, !xy ? 0 : +xy);

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
