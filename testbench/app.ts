/// <reference path="kb.ts" />
/// <reference path="xhr.ts" />
/// <reference path="ls.ts" />
/// <reference path="../src/search.ts" />
/// <reference path="editor.ts" />
/// <reference path="vm.ts" />
/// <reference path="directory.ts" />

window['board'] = null;

module testbench {
    import stone = tsumego.stone;
    import Board = tsumego.Board;
    import profile = tsumego.profile;

    declare var board: tsumego.Board;

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
    export var tt = new tsumego.TT;

    interface AsyncOperation {
        ntcalls: number;
        notify(): void;
    }

    // ?rs=123 sets the rand seed
    const rs = +qargs.rs || (Date.now() | 0);
    console.log('rand seed:', rs);
    tsumego.rand.seed(rs);

    function solve(op: AsyncOperation, board: Board, color: number, km: number, log = false): Promise<stone> {
        return Promise.resolve().then(() => {
            profile.reset();

            const g = tsumego.solve.start({
                root: board,
                color: color,
                km: km,
                time: 250,
                tt: tt,
                expand: tsumego.mgen.fixed(board, aim),
                alive: qargs.benson && ((b: Board) => tsumego.benson.alive(b, aim)),
                status: status
            });

            let s = g.next();

            return new Promise<stone>(resolve => {
                setTimeout(function fn() {
                    op.notify();

                    if (s.done) {
                        resolve(s.value);
                    } else {
                        op.ntcalls = s.value;
                        s = g.next();
                        setTimeout(fn);
                    }
                });
            }).then(rs => {
                if (log) {
                    profile.log();
                    console.log(s2s(color, rs));
                }

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

    function dbgsolve(board: Board, color: number, nkotreats = 0) {
        const solver = tsumego.solve.start({
            debug: true,
            root: board,
            color: color,
            tt: tt,
            expand: tsumego.mgen.fixed(board, aim),
            status: status,
            alive: qargs.benson && ((b: Board) => tsumego.benson.alive(b, aim))
        });

        window['solver'] = solver;

        let tick = 0;

        const next = (render = true) => {
            const {done, value} = solver.next();
            const comment: string = value;
            !done && tick++;

            if (render) {
                renderBoard();
                vm.note = comment;
            }
        };

        const stepOver = (ct: CancellationToken) => {
            const hash = board.hash;

            do {
                next(false);
            } while (board.hash != hash && !ct.cancelled);

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

        console.log(c2s(color), 'to play with', nkotreats, 'external ko treats\n',
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
            renderBoard();
        });
    }

    const sign = (x: number) => x > 0 ? +1 : x < 0 ? -1 : 0;
    const status = (b: Board) => sign(b.get(aim) || -tblock);

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
        vm.kmVisible = !!qargs.km;

        Promise.resolve().then(() => {
            const directory = new Directory(<HTMLElement>document.querySelector('.directory'));

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
                }).catch(e => {
                    console.log('cannot load', path, e.stack);
                    location.hash = '#blank';
                });
            }

            ls.added.push(path => {
                directory.add(path);
            });

            ls.removed.push(path => {
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

                            if (!lsdata[name])
                                directory.add(name);
                        }).catch(err => {
                            console.log(err.stack);
                        });
                    }
                }
            }).catch(err => {
                console.log(err.stack);
            });

            document.querySelector('#delete').addEventListener('click', e => {
                if (lspath && lspath != 'blank' && confirm('Delete problem ' + lspath + '?')) {
                    ls.set(lspath, null);
                    location.hash = '#blank';
                }
            });

            document.querySelector('#rename').addEventListener('click', e => {
                if (!lspath) return;

                const path2 = prompt('New name for ' + lspath);

                if (!path2) return;

                if (ls.data[path2])
                    alert(path2 + ' already exists');

                if (lspath != 'blank')
                    ls.set(lspath, null);

                lspath = path2;
                renderBoard(); // it saves the sgf at the new location
                location.hash = '#' + lspath;
            });

            document.querySelector('#solve-b').addEventListener('click', e => {
                lspath = null;
                solvingFor = +1;
                tblock = board.get(aim);

                if (vm.debugSolver)
                    dbgsolve(board, solvingFor, vm.km);
                else
                    solveAndRender(solvingFor, vm.km);
            });

            document.querySelector('#solve-w').addEventListener('click', e => {
                lspath = null;
                solvingFor = -1;
                tblock = board.get(aim);

                if (vm.debugSolver)
                    dbgsolve(board, solvingFor, vm.km);
                else
                    solveAndRender(solvingFor, vm.km);
            });

            document.querySelector('#flipc').addEventListener('click', e => {
                const b = new Board(board.size);

                for (const s of board.stones()) {
                    const x = stone.x(s);
                    const y = stone.y(s);
                    const c = stone.color(s);

                    b.play(stone(x, y, -c));
                }

                board = b.fork();
                renderBoard();
            });

            document.querySelector('#undo').addEventListener('click', () => {
                const move = board.undo();

                if (move)
                    console.log('undo ' + stone.toString(move));
                else
                    console.log('nothing to undo');

                console.log(board + '');
                renderBoard();
            });

            const input = <HTMLTextAreaElement>document.querySelector('#sgf');

            input.addEventListener('focusout', e => {
                try {
                    console.log('focusout');
                    updateSGF(vm.sgf);
                } catch (err) {
                    // partial input is not valid SGF
                    if (err instanceof SyntaxError)
                        return;
                    throw err;
                }
            });
        }).catch(err => {
            console.error(err.stack);
            alert(err);
        });
    });

    function loadProblem(path: string) {
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

                console.log(sgfdata);
                console.log(board + '');
                console.log(board.toStringSGF());
            });
        });
    }

    function updateSGF(sgfdata: string, nvar = 0) {
        const sgf = tsumego.SGF.parse(sgfdata);
        const setup = sgf.steps[0];

        board = new Board(sgfdata, nvar);
        aim = stone.fromString((setup['MA'] || ['aa'])[0]);
        selection = null;

        board = board.fork(); // drop the history of moves
        renderBoard();
    }

    function removeStone(x: number, y: number) {
        const b = new Board(board.size);

        for (const s of board.stones()) {
            const [sx, sy] = stone.coords(s);
            const c = stone.color(s);

            if (sx != x || sy != y)
                b.play(stone(sx, sy, c));
        }

        board = b.fork(); // drop history
    }

    document.addEventListener('keyup', event => {
        if (!selection)
            return;

        const enum KeyCode {
            Left = 37,
            Top = 38,
            Right = 39,
            Bottom = 40,

            Delete = 46,
        }

        switch (event.keyCode) {
            case KeyCode.Delete:
                for (const s of board.stones()) {
                    const x = stone.x(s);
                    const y = stone.y(s);

                    if (isSelected(x, y))
                        removeStone(x, y);
                }

                selection = null;
                renderBoard();
                break;

            case KeyCode.Left:
            case KeyCode.Top:
            case KeyCode.Right:
            case KeyCode.Bottom:

        }
    });

    function renderBoard() {
        const move = board.undo();
        board.play(move);

        vm.canUndo = !!move;

        const ui = GobanElement.create(board);

        if (stone.hascoords(move) && solvingFor)
            ui.TR.add(stone.x(move), stone.y(move));

        if (stone.hascoords(aim))
            ui.MA.add(stone.x(aim), stone.y(aim));

        for (const [x, y] of listSelectedCoords())
            ui.SL.add(x, y);

        //
        // manages the selection area
        //

        let selecting = false;
        let dragging = false;
        let dragged = false;
        let dragx = 0, dragy = 0;

        ui.addEventListener('mousedown', event => {
            if (!solvingFor && !vm.tool) {
                const cx = event.cellX;
                const cy = event.cellY;

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

        //
        // displays the current coordinates in the lower right corner
        //

        ui.addEventListener('mousemove', event => {
            const [x, y] = [event.cellX, event.cellY];
            const s = stone(x, y, 0);

            vm.coords = `${stone.cc.toString(s, board.size)} [${stone.toString(s)}]`;
        });

        ui.addEventListener('mouseout', () => {
            vm.coords = '';
        });

        //
        // the main click handler
        //

        ui.addEventListener('click', event => {
            const [x, y] = [event.cellX, event.cellY];
            const c = board.get(x, y);

            if (vm.tool == 'MA') {
                if (!solvingFor)
                    aim = stone(x, y, 0);
            } else if (/AB|AW/.test(vm.tool) || solvingFor) {
                if (c && !solvingFor)
                    removeStone(x, y);

                const color = vm.tool == 'AB' ? + 1 :
                    vm.tool == 'AW' ? -1 :
                        -solvingFor;

                board.play(stone(x, y, color));
            } else {
                return;
            }

            renderBoard();
            vm.note = stone.toString(stone(x, y, board.get(x, y)));
        });

        const wrapper = document.querySelector('.tsumego') as HTMLElement;
        wrapper.innerHTML = '';
        wrapper.appendChild(ui);

        const sgf = getProblemSGF();

        vm.sgf = sgf;
        vm.svg = wrapper.innerHTML;

        if (lspath)
            ls.set(lspath, sgf);
    }

    function getProblemSGF() {
        return board.toStringSGF('\n  ').replace(/\)$/,
            (stone.hascoords(aim) ? '\n  MA[' + stone.toString(aim) + ']' : '') +
            ')');
    }

    function parse(si: string, size: number): stone {
        const x = si.charCodeAt(0) - 65;
        const y = size - +/\d+/.exec(si)[0];

        return stone(x, y, 0);
    }

    function solveAndRender(color: number, km: number) {
        vm.note = 'Solving...';

        setTimeout(() => {
            const started = Date.now();

            const comment = () => ((Date.now() - started) / 1000 | 0) + 's'
                + '; tt size = ' + (tt.size / 1000 | 0) + 'K'
                + '; solved positions = ' + (op.ntcalls / 1000 | 0) + 'K';

            const op = {
                ntcalls: 0,
                notify() {
                    vm.note = 'Solving... elapsed ' + comment();
                }
            };

            solve(op, board, color, km, true).then(move => {
                const duration = Date.now() - started;

                if (!stone.hascoords(move) || move * color < 0) {
                    vm.note = c2s(color) + ' passes';
                } else {
                    board.play(move);
                    console.log(board + '');
                    renderBoard();
                    vm.note = stone.toString(move) + ' in ' + comment()
                }
            }).catch(err => {
                vm.note = err;
            });
        });
    }
}
