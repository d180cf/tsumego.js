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
    import profile = tsumego.profile;

    var goban: WGo.BasicPlayer = null;

    /** In SGF a B stone at x = 8, y = 2
        is written as B[ic] on a 9x9 goban
        it corresponds to J7 - the I letter
        is skipped and the y coordinate is
        counted from the bottom starting from 1. */
    const xy2s = (m: Move) => !Number.isFinite(m) ? 'null' :
        String.fromCharCode(0x41 + (Move.x(m) > 7 ? Move.x(m) - 1 : Move.x(m))) +
        (goban.board.size - Move.y(m));

    const c2s = Color.alias;
    const cm2s = (c: Color, m: Move) => c2s(c) + (Number.isFinite(m) ? ' plays at ' + xy2s(m) : ' passes');
    const cw2s = (c: Color, m: Move) => c2s(c) + ' wins by ' + (Number.isFinite(m) ? xy2s(m) : 'passing');

    /** { x: 2, y: 3 } -> `cd` */
    const xy2f = (xy: Move) => n2s(Move.x(xy)) + n2s(Move.y(xy));

    /** -1, { x: 2, y: 3 } -> `W[cd]` */
    const xyc2f = (c: Color, xy: Move) => (c > 0 ? 'B' : 'W') + '[' + xy2f(xy) + ']';

    /** `cd` -> { x: 2, y: 3 } */
    const f2xy = (s: string) => Move(s2n(s, 0), s2n(s, 1));

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
    export var tt = new tsumego.TT<Move>();

    function solve(path: Board[], color: Color, nkotreats: number = 0, log = false) {
        profile.reset();

        const rs = tsumego.solve(path, color, nkotreats, tt,
            tsumego.generators.Basic(rzone),
            status);

        if (log) {
            profile.log();
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

                const pass = !Number.isFinite(move);

                const node = new WGo.KNode({
                    _edited: true,
                    move: {
                        pass: pass,
                        x: Move.x(move),
                        y: Move.y(move),
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
            status,
            player);

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
            const i = path.length - 1;
            const b = path[i];

            while (path[i] === b && !ct.cancelled)
                next();
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

            stepOver(ct);
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
        if (!b.play(Move.x(move), Move.y(move), color)) {
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

        if (b.get(Move.x(aim), Move.y(aim))) {
            for (const m of rzone) {
                const bm = b.fork();
                if (!bm.play(Move.x(m), Move.y(m), -color))
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

    function status(b: Board) {
        return b.get(Move.x(aim), Move.y(aim)) < 0 ? -1 : +1;
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

    function makeMove(x: number, y: number, c: number) {
        const node = new WGo.KNode({
            _edited: true,
            move: {
                x: x,
                y: y,
                c: c > 0 ? WGo.B : WGo.W
            }
        });

        goban.kifuReader.node.appendChild(node);
        goban.next(goban.kifuReader.node.children.length - 1);
    }

    function parse(si: string, size: number): Move {
        const x = si.charCodeAt(0) - 65;
        const y = size - +/\d+/.exec(si)[0];

        return Move(x, y);
    }

    window['$'] = data => {
        const cmd = data.toString().trim().split(' ');
        const col = cmd[0].toLowerCase();

        switch (col) {
            case 'x':
            case 'o':
                const xy = cmd[1] && cmd[1].toUpperCase();
                const b = path[path.length - 1].fork();
                const c = cmd[0].toUpperCase() == 'O' ? -1 : +1;

                if (/^[a-z]\d+$/i.test(xy)) {
                    const p = parse(xy, b.size);

                    if (!b.play(Move.x(p), Move.y(p), c)) {
                        console.log(col, 'cannot play at', xy);
                    } else {
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + b);
                        makeMove(Move.x(p), Move.y(p), c);
                    }
                } else {
                    const {move} = solve(path, c, !xy ? 0 : +xy, true);

                    if (!Number.isFinite(move)) {
                        console.log(col, 'passes');
                    } else {
                        //const sgfp = sgfdata.replace(
                        //    /\)\s*$/,
                        //    '\n\n (' + proof(path, c, !xy ? 0 : +xy) + '))');

                        b.play(Move.x(move), Move.y(move), c);
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + b);
                        //renderSGF(sgfp);

                        makeMove(Move.x(move), Move.y(move), c);
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
