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
window['$b'] = tsumego.block.toString;
window['$x'] = tsumego.hex;
window['ui'] = null;

module testbench {
    import stone = tsumego.stone;
    import block = tsumego.block;
    import Board = tsumego.Board;
    import profile = tsumego.profile;
    import SGF = tsumego.SGF;

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

    interface AsyncOperation {
        notify(): void;
        cancelled?: string;
    }

    let solving: AsyncOperation;
    let problem: tsumego.Solver;

    // ?rs=123 sets the rand seed
    const rs = +qargs.rs || (Date.now() | 0);
    console.log('rand seed:', rs);
    tsumego.rand.seed(rs);

    function solve(op: AsyncOperation, board: Board, color: number, km: number): Promise<stone> {
        return Promise.resolve().then(() => {
            const g = problem.g_solve(color, {
                km: km,
                time: 300,
                benson: qargs.benson,
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
                        s = g.next();
                        setTimeout(fn);
                    }
                });
            });
        });
    }

    class CancellationToken {
        cancelled = false;
    }

    function sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    let aim: stone;
    let lspath = '';
    let solvingFor: tsumego.color;
    let stubs = new stone.Set; // stubs in the outer wall to make it safe

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

        const { xmin, xmax, ymin, ymax } = getSelectedRect();

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

    function updateVerticalLayout() {
        const ratio = vm.width / vm.height;

        if (ratio < 0.95)
            vm.isVertical = true;

        if (ratio > 1.05)
            vm.isVertical = false;
    }

    vm.resized.add(updateVerticalLayout);

    window.addEventListener('load', () => {
        updateVerticalLayout();

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
                        vm.mode = 'debugger';
                        lspath = null;
                        solvingFor = +1;
                        solvingFor = stone.label.color(qargs.debug);
                        dbgsolve(board, solvingFor, vm.km, aim, stubs, renderBoard);
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
                console.log('manifest time:', new Date(manifest.time));

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

                $('#solve-b, #solve-w').click(function (event) {
                    const color: tsumego.color = { 'solve-b': +1, 'solve-w': -1 }[this.id];

                    if (!color)
                        return;

                    try {
                        problem = problem || new tsumego.Solver(vm.sgf);
                    } catch (err) {
                        vm.note = err;
                        console.warn(err);
                        return;
                    }

                    vm.mode = 'solver';
                    lspath = null;
                    solvingFor = color;
                    board = problem.board;

                    if (event.shiftKey) {
                        vm.note = 'Looking for correct moves...';

                        // let the UI update its stuff...
                        setTimeout(() => {
                            let n = 0;
                            ui.SQ.clear();

                            for (const move of problem.proofs(color)) {
                                const [x, y] = stone.coords(move);
                                ui.SQ.add(x, y);
                                n++;
                            }

                            solvingFor = -color;

                            vm.note = n ?
                                'Here are all the correct solutions' :
                                'This problem does not have a solution';
                        }, 500);
                    } else if (event.ctrlKey) {
                        vm.note = 'Building a proof tree...';
                        vm.mode = 'proof-tree';

                        const g = problem.tree(color, qargs.ptd || 1, qargs.ptdi);

                        // every call to next() creates its own instance of goban element
                        (function next(move: stone) {
                            // let the UI update some stuf...
                            setTimeout(() => {
                                const { value, done } = g.next(move && stone.toString(move));

                                if (done) {
                                    const tree = value;
                                    send('POST', '/proof-tree', tree);
                                    vm.note = 'Proof tree ready: ' + (tree.length >> 10) + 'KB';
                                    vm.sgf = vm.sgf.trim().replace(/\)$/, '\n' + tree + ')');
                                    return;
                                }

                                const c = stone.label.color(value);

                                if (!c) {
                                    // that is just the solver reporting progress
                                    vm.note = 'Adding variations for ' + value;
                                    next(null);
                                    return;
                                }

                                vm.note = 'Pick the strongest response for ' + (value == 'W' ? 'white' : 'black');
                                const svg = renderBoard();

                                // mark the basic ko move
                                if (true) {
                                    const move = board.undo();
                                    const before = new stone.Set(board.stones(-stone.color(move)));
                                    const nres = board.play(move);

                                    // a basic ko always captures one stone
                                    if (nres == 2) {
                                        const after = new stone.Set(board.stones(-stone.color(move)));

                                        for (const s of before) {
                                            if (!after.has(s)) {
                                                const x = stone.x(s);
                                                const y = stone.y(s);

                                                svg.SQ.add(x, y);
                                            }
                                        }
                                    }
                                }

                                svg.addEventListener('click', event => {
                                    const x = event.cellX;
                                    const y = event.cellY;
                                    const s = stone.make(x, y, c);

                                    if (!board.play(s)) {
                                        next(null); // tell to end the variation here
                                    } else {
                                        renderBoard();
                                        vm.note = 'Ok, proceeding with this variation...';
                                        board.undo();
                                        next(s); // tell to continue the variation with this move
                                    }
                                });
                            }, qargs.delay || 0);
                        })(null);
                    } else {
                        solveAndRender(solvingFor, vm.km).then(move => {
                            if (move * color < 0)
                                solvingFor = -color;
                        });
                    }
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
        aim = setup['MA'] ? stone.fromString(setup['MA'][0]) : 0;
        selection = null;
        problem = null;
        solvingFor = 0;

        stubs.empty();

        for (const s of setup['SQ'] || [])
            stubs.add(stone.fromString(s));

        board = board.fork(); // drop the history of moves
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
    }

    const enum KeyCode {
        ArrowL = 37,
        ArrorT = 38,
        ArrowR = 39,
        ArrorB = 40,

        Delete = 46,
    }

    // removes all the stones in the selection
    $(document).on('keyup', event => {
        if (!selection)
            return;

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
        }
    });

    // moves all the stones in the given direction
    $(document).on('keyup', event => {
        if (!event.ctrlKey || selection)
            return;

        switch (event.keyCode) {
            case KeyCode.ArrowL:
            case KeyCode.ArrorT:
            case KeyCode.ArrowR:
            case KeyCode.ArrorB:
                const [dx, dy] = {
                    [KeyCode.ArrowL]: [-1, 0],
                    [KeyCode.ArrowR]: [+1, 0],
                    [KeyCode.ArrorT]: [0, -1],
                    [KeyCode.ArrorB]: [0, +1],
                }[event.keyCode];

                const b = new Board(board.size);
                const shift = (s: stone, q = stone.move(s, dx, dy)) => b.inBounds(q) ? q : 0;
                const t = aim && shift(aim);

                for (const s of board.stones())
                    if (!b.play(shift(s)))
                        return;

                if (aim && !t)
                    return;

                const stubs2 = stubs.map(shift);

                if (!stubs2)
                    return;

                stubs.empty();
                stubs.add(...stubs2);
                aim = t;
                board = b;
                renderBoard();
        }
    });

    // resizes the board
    $(document).on('keyup', event => {
        if (!event.shiftKey || selection)
            return;

        try {
            switch (event.keyCode) {
                case KeyCode.ArrowL:
                case KeyCode.ArrowR:
                    const ds = event.keyCode == KeyCode.ArrowR ? +1 : -1;
                    const b = new Board(board.size + ds)
                    const r = block.join(board.rect(0), stubs.rect);

                    let dx = 0;
                    let dy = 0;

                    if (block.xmax(r) == board.size - 1)
                        dx = ds;

                    if (block.ymax(r) == board.size - 1)
                        dy = ds;

                    if (block.xmin(r) == 0)
                        dx = 0;

                    if (block.ymin(r) == 0)
                        dy = 0;

                    const shift = (s: stone, q = stone.move(s, dx, dy)) => b.inBounds(q) ? q : 0;

                    for (const s of board.stones())
                        if (!b.play(shift(s)))
                            return;

                    const t = aim = aim && shift(aim);

                    if (aim && !t)
                        return;

                    const stubs2 = stubs.map(shift);

                    if (!stubs2)
                        return;

                    stubs.empty();
                    stubs.add(...stubs2);
                    aim = t;
                    board = b;
                    renderBoard();
            }
        } catch (err) {
            vm.note = err;
            console.warn(err);
            throw err;
        }
    });

    // this is an extremely slow method:
    // it creates the SVG board, sets up
    // mouse handlers and so on
    function renderBoard() {
        console.warn('Creating a SVG board...');
        ui = SVGGobanElement.create('(;SZ[' + board.size + '])');
        updateBoard();

        for (const s of stubs)
            ui.SQ.add(stone.x(s), stone.y(s));

        if (stone.hascoords(aim))
            ui.MA.add(stone.x(aim), stone.y(aim));

        //
        // manages the selection area
        //

        if (vm.mode == 'editor') {
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

        if (vm.mode == 'editor' || vm.mode == 'solver') {
            ui.addEventListener('click', event => {
                const [x, y] = [event.cellX, event.cellY];
                const c = board.get(x, y);

                if (vm.tool == 'MA') { // mark the target
                    if (!solvingFor) {
                        aim = stone.make(x, y, 0);
                        ui.MA.clear();
                        ui.MA.add(x, y);
                        updateProblemSGF();
                    }
                } else if (vm.tool == 'SQ') { // add a stub to the outer wall
                    stubs.xor(stone.make(x, y, 0));
                    ui.SQ.flip(x, y);
                    updateProblemSGF();
                } else if (vm.tool == 'XX') { // removes a stone
                    if (board.get(x, y)) {
                        removeStone(x, y);
                        ui.AB.remove(x, y);
                        ui.AW.remove(x, y);
                        updateProblemSGF();
                    }
                } else if (vm.tool == 'AB' || vm.tool == 'AW') {
                    const color = vm.tool == 'AB' ? +1 : -1;

                    // the idea is to remove stone before adding one of the opposite color
                    if (color * c < 0)
                        removeStone(x, y);

                    board.play(stone.make(x, y, color));
                    updateBoard();
                } else if (vm.mode == 'solver') {
                    const color = -solvingFor;
                    board.play(stone.make(x, y, color));
                    updateBoard();

                    if (qargs.autorespond) {
                        if (qargs.check) {
                            vm.note = `Checking if ${stone.label.string(-color)} needs to respond...`;

                            setTimeout(() => {
                                solve(null, board, color, vm.km).then(move => {
                                    if (color * move < 0)
                                        vm.note = stone.label.string(-color) + ' does not need to respond';
                                    else
                                        solveAndRender(-color, vm.km);
                                });
                            });
                        } else {
                            solveAndRender(-color, vm.km);
                        }
                    }
                }
            });
        }

        const wrapper = document.querySelector('.tsumego') as HTMLElement;
        wrapper.innerHTML = '';
        wrapper.appendChild(ui);

        if (vm.mode == 'editor')
            updateProblemSGF();

        return ui;
    }

    // finds the diff between what's on the screen
    // and what's in the app state and updates the UI;
    // this updates the local storage too in the editor mode
    function updateBoard() {
        for (let x = 0; x < board.size; x++) {
            for (let y = 0; y < board.size; y++) {
                const color = board.get(x, y);

                if (color > 0)
                    ui.AB.add(x, y);

                if (color < 0)
                    ui.AW.add(x, y);

                if (!color) {
                    ui.AB.remove(x, y);
                    ui.AW.remove(x, y);
                }
            }
        }

        // mark the last played move
        if (vm.mode == 'solver') {
            const move = board.undo();
            board.play(move);
            vm.canUndo = !!move;

            if (stone.hascoords(move)) {
                ui.TR.clear();
                ui.TR.add(stone.x(move), stone.y(move));
            }
        }

        updateProblemSGF();
    }

    function updateProblemSGF() {
        const wrapper = document.querySelector('.tsumego') as HTMLElement;
        const sgf = getProblemSGF();

        try {
            SGF.parse(sgf);

            vm.sgf = sgf;
            vm.svg = wrapper.innerHTML;

            if (lspath && vm.mode == 'editor')
                ls.set(lspath, sgf);
        } catch (err) {
            vm.note = err;
            console.warn(err);
        }
    }

    function getProblemSGF() {
        let sgf = board.toStringSGF('\n  ').slice(+1, -1);

        if (stone.hascoords(aim))
            sgf += '\n  MA' + stone.toString(aim);

        if (stubs.size > 0)
            sgf += '\n  SQ' + [...stubs].map(s => stone.toString(s)).join('');

        return '(' + sgf + ')';
    }

    function parse(si: string, size: number): stone {
        const x = si.charCodeAt(0) - 65;
        const y = size - +/\d+/.exec(si)[0];

        return stone.make(x, y, 0);
    }

    function solveAndRender(color: number, km: number) {
        vm.note = 'Solving...';

        let _calls: number;
        let _nodes: number;
        let _time: number;

        let prev = '';

        // it gives an idea what the solver is doing
        function getSequenceInfo() {
            const s = board.moves.map(stone.toString).join(';');

            let i = 0;

            while (i < 40 && i < prev.length && i < s.length && s[i] == prev[i])
                i++;

            prev = s;

            let r = s.slice(0, i);

            if (i < s.length) {
                if (r != '')
                    r += '... ';

                r += '(' + board.moves.length + ' moves)';
            }

            return r;
        }

        const started = Date.now();
        const elapsed = () => (Date.now() - started) / 1000 | 0;

        const comment = () => elapsed() + ' s'
            + '; calls = ' + ((tsumego.stat.calls - _calls) / (Date.now() - _time) | 0) + 'K/s'
            + '; nodes = ' + ((tsumego.stat.nodes - _nodes) / (Date.now() - _time) | 0) + 'K/s'
            + '; moves = ' + getSequenceInfo();

        const op = solving = {
            notify() {
                vm.note = 'Solving... elapsed ' + comment();
                _calls = tsumego.stat.calls;
                _nodes = tsumego.stat.nodes;
                _time = Date.now();
            }
        };

        return solve(op, board, color, km).then(move => {
            solving = null;

            if (move * color < 0) {
                const note = color * board.get(aim) < 0 ?
                    stone.label.string(color) + ' cannot capture the group' :
                    stone.label.string(color) + ' cannot save the group';

                console.log(note);
                vm.note = note + ', searching for treats...';

                return Promise.resolve().then(() => {
                    let n = 0;
                    ui.SQ.clear();

                    for (const threat of problem.threats(color)) {
                        const [x, y] = stone.coords(stone.fromString(threat));

                        n++;
                        ui.SQ.add(x, y);
                    }

                    if (n > 0)
                        vm.note = note + ', but here are moves that require response from ' + stone.label.string(-color);
                    else
                        vm.note = note;

                    return move;
                });
            } else if (!stone.hascoords(move)) {
                vm.note = stone.label.string(color) + ' passes';
            } else {
                problem.play(move);
                updateBoard();
                vm.note = stone.toString(move) + ' in ' + elapsed() + 's';
                console.log('(;' + board.moves.map(stone.toString).join(';') + ')');
                console.log(comment());
                console.log(tsumego.stat.summarizxe().join('\n'));
            }

            return move;
        }).catch(err => {
            debugger;
            solving = null;
            vm.note = err;
            console.error(err);
            throw err;
        });
    }
}
