/// <reference path="kb.ts" />
/// <reference path="xhr.ts" />
/// <reference path="ls.ts" />
/// <reference path="../src/search.ts" />
/// <reference path="editor.ts" />
/// <reference path="vm.ts" />

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
        notify(): void;
    }

    function solve(op: AsyncOperation, board: Board, color: number, nkotreats: number = 0, log = false): Promise<stone> {
        return Promise.resolve().then(() => {
            profile.reset();

            const g = tsumego.solve.start({
                root: board,
                color: color,
                nkt: nkotreats,
                time: 1000,
                tt: tt,
                expand: tsumego.mgen.fixed(board, aim),
                status: status
            });

            let s = g.next();

            return new Promise<stone>(resolve => {
                setTimeout(function fn() {
                    op.notify();

                    if (s.done)
                        resolve(s.value);
                    else {
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
            nkt: nkotreats,
            tt: tt,
            expand: tsumego.mgen.fixed(board, aim),
            status: status,
            alive: (b: Board) => tsumego.benson.alive(b, aim)
        });

        window['solver'] = solver;

        let tick = 0;

        const next = (render = true) => {
            const {done, value} = solver.next();
            const comment: string = value;
            !done && tick++;

            if (render) {
                location.hash = '#hash=' + (0x100000000 + board.hash).toString(16).slice(-8) + '&step=' + tick;
                renderBoard(comment);
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

    function status(b: Board) {
        return b.get(stone.x(aim), stone.y(aim)) < 0 ? -1 : +1;
    }

    var aim = 0, lspath = '', selectedCells = new stone.SmallSet;

    window.addEventListener('load', () => {
        Promise.resolve().then(() => {
            const directory = document.querySelector('.directory');

            function addDirEntry(path: string) {
                const entry = document.createElement('a');

                entry.className = 'entry';
                entry.textContent = path;
                entry.href = '#' + path;
                directory.appendChild(entry);

                return entry;
            }

            window.addEventListener('hashchange', () => {
                const path = location.hash.slice(1); // #abc -> abc

                if (path.length > 0) {
                    loadProblem(path).catch(e => {
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

                loadProblem(path).catch(e => {
                    console.log('cannot load', path, e.stack);
                    location.hash = '#blank';
                });
            }

            ls.added.push(path => {
                for (const e of directory.querySelectorAll('.entry')) {
                    const a = <HTMLAnchorElement>e;

                    if (a.hash == '#' + path)
                        return;
                }

                addDirEntry(path);
            });

            ls.removed.push(path => {
                for (const e of directory.querySelectorAll('.entry')) {
                    const a = <HTMLAnchorElement>e;

                    if (a.hash == '#' + path) {
                        a.parentNode.removeChild(a);
                        break;
                    }
                }
            });

            const lsdata = ls.data;

            for (let path in lsdata)
                addDirEntry(path);

            send('GET', '/problems/manifest.json').then(data => {
                const manifest = JSON.parse(data);

                for (const dir of manifest.dirs) {
                    for (const path of dir.problems) {
                        send('GET', '/problems/' + path).then(sgf => {
                            const root = tsumego.SGF.parse(sgf);

                            if (!root)
                                throw SyntaxError('Invalid SGF from ' + path);

                            for (let nvar = 0; nvar <= root.vars.length; nvar++) {
                                const name = path.replace('.sgf', '') + (nvar ? ':' + nvar : '');

                                if (!lsdata[name])
                                    addDirEntry(name);
                            }
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

            document.querySelector('#solve').addEventListener('click', e => {
                if (!vm.solveFor) {
                    alert('Choose which side plays first');
                    return;
                }

                lspath = null;

                if (vm.debugSolver)
                    dbgsolve(board, vm.solveFor, vm.nkt);
                else
                    solveAndRender(vm.solveFor, vm.nkt);
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

            document.querySelector('#download').addEventListener('click', e => {
                const a = document.createElement('a');
                const blob = new Blob([getProblemSGF()], { type: 'application/x-go-sgf' });
                a.href = URL.createObjectURL(blob);
                a['download'] = /[^\/]+$/.exec(lspath)[0] + '.sgf';
                a.click();
            });

            document.querySelector('#getsvg').addEventListener('click', e => {
                const div = <HTMLDivElement>document.querySelector('.tsumego');
                const a = document.createElement('a');
                const blob = new Blob([div.innerHTML], { type: 'image/svg+xml' });
                a.href = URL.createObjectURL(blob);
                a['download'] = /[^\/]+$/.exec(lspath)[0] + '.svg';
                a.click();
            });

            const sgfinput = <HTMLTextAreaElement>document.querySelector('#sgf');

            sgfinput.addEventListener('input', e => {
                try {
                    updateSGF(sgfinput.value);
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

                for (const e of document.querySelectorAll('.directory .entry')) {
                    const a = <HTMLAnchorElement>e;

                    if (a.hash == '#' + path)
                        a.classList.add('selected');
                    else
                        a.classList.remove('selected');
                }
            });
        });
    }

    function updateSGF(sgfdata: string, nvar = 0) {
        const sgf = tsumego.SGF.parse(sgfdata);
        const setup = sgf.steps[0];

        board = new Board(sgfdata, nvar);
        aim = stone.fromString((setup['MA'] || ['aa'])[0]);
        selectedCells = new stone.SmallSet;

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
        if (event.keyCode == 46) { // del
            for (const s of selectedCells)
                removeStone(stone.x(s), stone.y(s));

            selectedCells.empty();
            renderBoard();
        }
    });

    function renderBoard(comment = '') {
        const move = board.undo();
        board.play(move);

        const ui = GobanElement.create(board);

        if (stone.hascoords(move))
            ui.TR.add(stone.x(move), stone.y(move));

        if (stone.hascoords(aim))
            ui.MA.add(stone.x(aim), stone.y(aim));

        for (const s of selectedCells)
            ui.SL.add(stone.x(s), stone.y(s));

        // this is where selection started
        let sel0x: number;
        let sel0y: number;

        ui.addEventListener('mousedown', event => {
            if (event.ctrlKey)
                [sel0x, sel0y] = ui.getStoneCoords(event);
        });

        ui.addEventListener('mouseup', event => {
            if (event.ctrlKey && sel0x >= 0 && sel0y >= 0) {
                const [sel1x, sel1y] = ui.getStoneCoords(event);

                for (let x = Math.min(sel0x, sel1x); x <= Math.max(sel0x, sel1x); x++)
                    for (let y = Math.min(sel0y, sel1y); y <= Math.max(sel0y, sel1y); y++)
                        selectedCells.add(stone(x, y, 0));

                sel0x = undefined;
                sel0y = undefined;
                renderBoard();
            }
        });

        ui.addEventListener('mousemove', event => {
            const [x, y] = ui.getStoneCoords(event);
            const s = stone(x, y, 0);

            document.title = document.title.replace(
                /^(.+?)( - [a-z][a-z] - [A-Z]\d+)?$/,
                `$1 - ${stone.toString(s)} - ${stone.cc.toString(s, board.size)}`);
        });

        ui.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            const [x, y] = ui.getStoneCoords(event);
            const c = board.get(x, y);

            if (!lspath) {
                const s = stone(x, y, -vm.solveFor);
                const r = board.play(s);
                if (!r) console.log(stone.toString(s) + ' cannot be played on this board:\n' + board);
            } else switch (vm.tool) {
                case 'MA':
                    // mark the target                    
                    aim = stone(x, y, 0);
                    break;

                case 'AB':
                    // add a black stone
                    if (c) removeStone(x, y);
                    board.play(stone(x, y, +1));
                    break;

                case 'AW':
                    // add a white stone
                    if (c) removeStone(x, y);
                    board.play(stone(x, y, -1));
                    break;

                default:
                    // clicking anywhere clears the selection
                    selectedCells = new stone.SmallSet;
            }

            renderBoard();
        });

        const wrapper = document.querySelector('.tsumego') as HTMLElement;
        wrapper.innerHTML = '';
        wrapper.appendChild(ui);

        const editor = document.querySelector('.tsumego-sgf') as HTMLElement;
        const sgf = getProblemSGF();

        editor.textContent = sgf;

        setComment(comment);

        if (lspath)
            ls.set(lspath, sgf);
    }

    function getProblemSGF() {
        return board.toStringSGF('\n  ').replace(/\)$/,
            (stone.hascoords(aim) ? '\n  MA[' + stone.toString(aim) + ']' : '') +
            ')');
    }

    function setComment(comment: string) {
        document.querySelector('#comment').textContent = comment;
    }

    function parse(si: string, size: number): stone {
        const x = si.charCodeAt(0) - 65;
        const y = size - +/\d+/.exec(si)[0];

        return stone(x, y, 0);
    }

    function solveAndRender(color: number, nkt = 0) {
        setComment('Solving...');

        setTimeout(() => {
            const started = Date.now();

            const op = {
                notify() {
                    const duration = Date.now() - started;
                    const comment = 'Solving... elapsed ' + (duration / 1000).toFixed(1) + 's; cached ' + tt.size + ' positions'
                    setComment(comment);
                }
            };

            solve(op, board, color, nkt, true).then(move => {
                const duration = Date.now() - started;

                if (!stone.hascoords(move) || move * color < 0) {
                    setComment(c2s(color) + ' passes');
                } else {
                    board.play(move);
                    console.log(board + '');
                    const comment = stone.toString(move) + ' in ' + (duration / 1000).toFixed(1) + 's; cached ' + tt.size + ' positions';
                    renderBoard(comment);
                }
            }).catch(err => {
                setComment(err);
            });
        });
    }
}
