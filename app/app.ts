/// <reference path="../tsumego.d.ts" />
/// <reference path="kb.ts" />
/// <reference path="xhr.ts" />
/// <reference path="goban.ts" />
/// <reference path="vm.ts" />
/// <reference path="directory.ts" />
/// <reference path="debugger.ts" />

// this is useful when debugging
window['board'] = null;
window['$s'] = tsumego.stone.toString;
window['$x'] = tsumego.hex;
window['ui'] = null;

module testbench {
    import stone = tsumego.stone;
    import Board = tsumego.Board;
    import profile = tsumego.profile;

    declare var board: tsumego.Board;
    declare var ui: SVGGobanElement;

    /** In SGF a B stone at x = 8, y = 2
        is written as B[ic] on a 9x9 goban
        it corresponds to J7 - the I letter
        is skipped and the y coordinate is
        counted from the bottom starting from 1. */
    const xy2s = (m: stone) => !stone.hascoords(m) ? null :
        String.fromCharCode(0x41 + (stone.x(m) > 7 ? stone.x(m) - 1 : stone.x(m))) +
        (board.size - stone.y(m));

    const c2s = (c: number) => c > 0 ? 'B' : 'W';
    const s2c = (s: string) => s == 'B' ? +1 : s == 'W' ? -1 : 0;
    const cm2s = (c: number, m: stone) => c2s(c) + (Number.isFinite(m) ? ' plays at ' + xy2s(m) : ' passes');
    const cw2s = (c: number, m: stone) => c2s(c) + ' wins by ' + (Number.isFinite(m) ? xy2s(m) : 'passing');

    function s2s(c: number, s: stone) {
        let isDraw = stone.color(s) == 0;
        let isLoss = s * c < 0;

        return c2s(c) + ' ' + (isLoss ? 'loses' : (isDraw ? 'draws' : 'wins') + ' with ' + xy2s(s));
    }

    /** shared transposition table for black and white */
    export var tt: tsumego.TT;

    interface AsyncOperation {
        ntcalls: number;
        notify(): void;
        cancelled?: string;
    }

    let solving: AsyncOperation;

    // ?rs=123 sets the rand seed
    const rs = +qargs.rs || (Date.now() | 0);
    console.log('rand seed:', rs);
    tsumego.rand.seed(rs);

    function solve(op: AsyncOperation, board: Board, color: number, km: number, log = false): Promise<stone> {
        return Promise.resolve().then(() => {
            profile.reset();

            const g = tsumego.solve.start({
                board: board,
                color: color,
                km: km,
                time: 250,
                tt: tt,
                target: aim,
                expand: tsumego.mgen.fixed(board, aim),
                alive: qargs.benson && ((b: Board) => tsumego.benson.alive(b, aim)),
            });

            let s = g.next();

            return new Promise<stone>((resolve, reject) => {
                setTimeout(function fn() {
                    op && op.notify();

                    if (op && op.cancelled) {
                        reject(op.cancelled);
                    } else if (s.done) {
                        resolve(s.value);
                    } else {
                        if (op) op.ntcalls = s.value;
                        s = g.next();
                        setTimeout(fn);
                    }
                });
            }).then(rs => {
                log && profile.log();
                return rs;
            });
        });
    }

    class CancellationToken {
        cancelled = false;
    }

    function sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    const sign = (x: number) => x > 0 ? +1 : x < 0 ? -1 : 0;

    var aim = 0, lspath = '', solvingFor, tblock: number;

    var selection: { x1: number, y1: number, x2: number, y2: number };

    function getSelectedRect() {
        return selection && {
            xmin: Math.min(selection.x1, selection.x2),
            ymin: Math.min(selection.y1, selection.y2),
            xmax: Math.max(selection.x1, selection.x2),
            ymax: Math.max(selection.y1, selection.y2),
        };
    }

    function* listSelectedCoords() {
        if (!selection)
            return;

        const {xmin, xmax, ymin, ymax} = getSelectedRect();

        for (let x = xmin; x <= xmax; x++) {
            for (let y = ymin; y <= ymax; y++) {
                yield [x, y];
            }
        }
    }

    function isSelected(x: number, y: number) {
        const rect = getSelectedRect();

        return rect
            && rect.xmin <= x && x <= rect.xmax
            && rect.ymin <= y && y <= rect.ymax;
    }

    window.addEventListener('load', () => {
        if (qargs.km) {
            vm.kmVisible = true;
            vm.km = stone.label.color(qargs.km);
        }

        Promise.resolve().then(() => {
            const directory = new Directory('#directory');

            window.addEventListener('hashchange', () => {
                const path = location.hash.slice(1); // #abc -> abc

                if (path.length > 0) {
                    loadProblem(path).then(() => {
                        directory.select(path);
                    }).catch(e => {
                        console.log(e.stack);
                        document.querySelector('.tsumego').textContent = e;
                    });
                }
            });

            if (!ls.data['blank'])
                ls.set('blank', new Board(9).toStringSGF());

            if (!location.hash)
                location.hash = '#blank';
            else {
                const path = location.hash.slice(1); // #abc -> abc

                loadProblem(path).then(() => {
                    directory.select(path);

                    if (qargs.debug) {
                        vm.dbg.enabled = true;
                        lspath = null;
                        solvingFor = +1;
                        tblock = board.get(aim);
                        solvingFor = stone.label.color(qargs.debug);
                        dbgsolve(board, solvingFor, vm.km, aim, tt, renderBoard);
                        console.warn('debug mode is on');
                    }
                }).catch(e => {
                    console.log('cannot load', path, e.stack);
                    location.hash = '#blank';
                });
            }

            ls.added.add(path => {
                directory.add(path);
            });

            ls.removed.add(path => {
                directory.remove(path);
            });

            const lsdata = ls.data;

            for (let path in lsdata)
                directory.add(path);

            send('GET', '/problems/manifest.json').then(data => {
                const manifest = JSON.parse(data);

                for (const dir of manifest.dirs) {
                    for (const path of dir.problems) {
                        send('GET', '/problems/' + path).then(sgf => {
                            const root = tsumego.SGF.parse(sgf);

                            if (!root)
                                throw SyntaxError('Invalid SGF from ' + path);

                            const name = path.replace('.sgf', '');

                            // the problem is considered to be hard if it
                            // doesn't appear in unit tests
                            directory.item(name).hard = !/\bPL\[/.test(sgf);
                        }).catch(err => {
                            console.log(err.stack);
                        });
                    }
                }
            }).catch(err => {
                console.log(err.stack);
            });

            if (!qargs.debug) {
                directory.deleted.add(path => {
                    console.log('deleting ' + path + '...');
                    ls.set(path, null);
                });

                document.querySelector('#solve-b').addEventListener('click', e => {
                    lspath = null;
                    solvingFor = +1;
                    tblock = board.get(aim);
                    solveAndRender(solvingFor, vm.km);
                });

                document.querySelector('#solve-w').addEventListener('click', e => {
                    lspath = null;
                    solvingFor = -1;
                    tblock = board.get(aim);
                    solveAndRender(solvingFor, vm.km);
                });

                document.querySelector('#flipc').addEventListener('click', e => {
                    const b = new Board(board.size);

                    for (const s of board.stones()) {
                        const x = stone.x(s);
                        const y = stone.y(s);
                        const c = stone.color(s);

                        b.play(stone.make(x, y, -c));
                    }

                    board = b.fork();
                    tt = new tsumego.TT;
                    renderBoard();
                });

                document.querySelector('#undo').addEventListener('click', () => {
                    const move = board.undo();

                    if (!move)
                        vm.note = 'Nothing to undo';

                    renderBoard();
                });

                vm.sgfchanged.add(() => {
                    try {
                        updateSGF(vm.sgf);
                    } catch (err) {
                        // partial input is not valid SGF
                        if (err instanceof SyntaxError)
                            return;
                        throw err;
                    }
                });
            }
        }).catch(err => {
            console.error(err.stack);
            alert(err);
        });
    });

    function loadProblem(path: string) {
        if (solving)
            solving.cancelled = 'cancelled because loading ' + path;

        return Promise.resolve().then(() => {
            console.log('loading problem', path);
            const [source, nvar] = path.split(':');

            document.title = source;
            lspath = source;

            return Promise.resolve().then(() => {
                return ls.data[source] || send('GET', '/problems/' + source + '.sgf').catch(e => {
                    console.log(source, 'cannot be loaded', e);
                    return new Board(9).toStringSGF();
                });
            }).then(sgfdata => {
                updateSGF(sgfdata, nvar && +nvar);
            });
        });
    }

    function updateSGF(sgfdata: string, nvar = 0) {
        const sgf = tsumego.SGF.parse(sgfdata);

        if (!sgf) {
            debugger;
            console.error('Invalid SGF:\n' + sgfdata);
            throw new SyntaxError('Invalid SGF');
        }

        const setup = sgf.steps[0];

        board = new Board(sgfdata, nvar);
        aim = stone.fromString((setup['MA'] || ['aa'])[0]);
        selection = null;

        board = board.fork(); // drop the history of moves
        tt = new tsumego.TT;
        renderBoard();
    }

    function removeStone(x: number, y: number) {
        const b = new Board(board.size);

        for (const s of board.stones()) {
            const [sx, sy] = stone.coords(s);
            const c = stone.color(s);

            if (sx != x || sy != y)
                b.play(stone.make(sx, sy, c));
        }

        board = b.fork(); // drop history
        tt = new tsumego.TT;
    }

    document.addEventListener('keyup', event => {
        const enum KeyCode {
            ArrowL = 37,
            ArrorT = 38,
            ArrowR = 39,
            ArrorB = 40,

            Delete = 46,
        }

        switch (event.keyCode) {
            case KeyCode.Delete:
                if (!selection)
                    return;

                for (const s of board.stones()) {
                    const x = stone.x(s);
                    const y = stone.y(s);

                    if (isSelected(x, y))
                        removeStone(x, y);
                }

                selection = null;
                renderBoard();
                return;

            case KeyCode.ArrowL:
            case KeyCode.ArrorT:
            case KeyCode.ArrowR:
            case KeyCode.ArrorB:
                if (!event.ctrlKey || selection)
                    return;

                const [dx, dy] = {
                    [KeyCode.ArrowL]: [-1, 0],
                    [KeyCode.ArrowR]: [+1, 0],
                    [KeyCode.ArrorT]: [0, -1],
                    [KeyCode.ArrorB]: [0, +1],
                }[event.keyCode];

                const b = new Board(board.size);
                const t = stone.make(stone.x(aim) + dx, stone.y(aim) + dy, 0);

                try {
                    if (!b.inBounds(t))
                        throw aim;

                    for (const s1 of board.stones()) {
                        const [x1, y1] = stone.coords(s1);
                        const [x2, y2] = [x1 + dx, y1 + dy];
                        const s2 = stone.make(x2, y2, stone.color(s1));

                        if (!b.inBounds(x2, y2) || !b.play(s2))
                            throw s1;
                    }
                } catch (err) {
                    if (typeof err === 'number' && board.inBounds(err)) {
                        ui.SL.add(stone.x(err), stone.y(err));
                        vm.note = 'Cannot move ' + stone.toString(err);
                        return;
                    }

                    throw err;
                }

                aim = t;
                board = b;
                tt = new tsumego.TT;
                renderBoard();
                return;
        }
    });

    function renderBoard() {
        const move = board.undo();
        board.play(move);

        vm.canUndo = !!move;

        ui = SVGGobanElement.create(board);

        if (stone.hascoords(move) && solvingFor)
            ui.TR.add(stone.x(move), stone.y(move));

        if (stone.hascoords(aim))
            ui.MA.add(stone.x(aim), stone.y(aim));

        for (const [x, y] of listSelectedCoords())
            ui.SL.add(x, y);

        //
        // manages the selection area
        //

        if (!qargs.debug) {
            let selecting = false;
            let dragging = false;
            let dragged = false;
            let dragx = 0, dragy = 0;

            ui.addEventListener('mousedown', event => {
                const cx = event.cellX;
                const cy = event.cellY;

                if (!solvingFor && !vm.tool && cx >= 0 && cy >= 0) {
                    if (!isSelected(cx, cy)) {
                        // start selection
                        if (selection)
                            ui.SL.clear();

                        selecting = true;
                        selection = { x1: cx, y1: cy, x2: cx, y2: cy, };
                    } else {
                        // start drag'n'drop
                        dragging = true;
                        dragged = false;
                        dragx = cx;
                        dragy = cy;
                    }
                }
            });

            ui.addEventListener('mousemove', event => {
                const cx = event.cellX;
                const cy = event.cellY;

                if (selecting) {
                    selection.x2 = cx;
                    selection.y2 = cy;

                    ui.SL.clear();

                    for (const [x, y] of listSelectedCoords())
                        ui.SL.add(x, y);
                }

                if (dragging) {
                    const dx = cx - dragx;
                    const dy = cy - dragy;

                    if (dx || dy) {
                        selection.x1 += dx;
                        selection.x2 += dx;
                        selection.y1 += dy;
                        selection.y2 += dy;

                        dragx = cx;
                        dragy = cy;

                        ui.SL.clear();

                        for (const [x, y] of listSelectedCoords())
                            ui.SL.add(x, y);

                        dragged = true;
                    }
                }
            });

            ui.addEventListener('mouseup', event => {
                if (dragging && !dragged) {
                    selection = null;
                    ui.SL.clear();
                }

                selecting = false;
                dragging = false;
            });
        }

        //
        // displays the current coordinates in the lower right corner
        //

        ui.addEventListener('mousemove', event => {
            const [x, y] = [event.cellX, event.cellY];
            const s = stone.make(x, y, 0);

            vm.coords = x >= 0 && y >= 0 ? `${stone.cc.toString(s, board.size)} ${stone.toString(s)}` : '';
        });

        ui.addEventListener('mouseout', () => {
            vm.coords = '';
        });

        //
        // the main click handler
        //

        if (!qargs.debug) {
            ui.addEventListener('click', event => {
                const [x, y] = [event.cellX, event.cellY];
                const c = board.get(x, y);

                if (vm.tool == 'MA') {
                    if (!solvingFor)
                        aim = stone.make(x, y, 0);
                } else if (/AB|AW/.test(vm.tool) || solvingFor) {
                    if (c && !solvingFor)
                        removeStone(x, y);

                    const color = vm.tool == 'AB' ? + 1 :
                        vm.tool == 'AW' ? -1 :
                            -solvingFor;

                    board.play(stone.make(x, y, color));

                    if (color == -solvingFor && qargs.autorespond) {
                        // check if a response is needed
                        solve(null, board, color, vm.km).then(move => {
                            if (color * move < 0)
                                vm.note = stone.label.string(-color) + ' does not need to respond';
                            else
                                return solveAndRender(-color, vm.km);
                        });
                    }
                } else {
                    return;
                }

                renderBoard();
                vm.note = stone.toString(stone.make(x, y, board.get(x, y)));
            });
        }

        const wrapper = document.querySelector('.tsumego') as HTMLElement;
        wrapper.innerHTML = '';
        wrapper.appendChild(ui);

        const sgf = getProblemSGF();

        vm.sgf = sgf;
        vm.svg = wrapper.innerHTML;

        if (lspath)
            ls.set(lspath, sgf);

        return ui;
    }

    function getProblemSGF() {
        return board.toStringSGF('\n  ').replace(/\)$/,
            (stone.hascoords(aim) ? '\n  MA' + stone.toString(aim) : '') +
            ')');
    }

    function parse(si: string, size: number): stone {
        const x = si.charCodeAt(0) - 65;
        const y = size - +/\d+/.exec(si)[0];

        return stone.make(x, y, 0);
    }

    function solveAndRender(color: number, km: number) {
        vm.note = 'Solving...';

        const started = Date.now();

        const comment = () => ((Date.now() - started) / 1000 | 0) + 's'
            + '; tt size = ' + (tt.size / 1000 | 0) + 'K'
            + '; playouts = ' + (op.ntcalls / 1000 | 0) + 'K';

        const op = solving = {
            ntcalls: 0,
            notify() {
                vm.note = 'Solving... elapsed ' + comment();
            }
        };

        return solve(op, board, color, km, true).then(move => {
            const duration = Date.now() - started;

            solving = null;

            if (!stone.hascoords(move) || move * color < 0) {
                vm.note = c2s(color) + ' passes';
            } else {
                board.play(move);
                renderBoard();
                vm.note = stone.toString(move) + ' in ' + comment();
                console.log('(;' + board.moves.map(stone.toString).join(';') + ')');
            }

            return move;
        }).catch(err => {
            solving = null;
            vm.note = err;
            throw err;
        });
    }
}
