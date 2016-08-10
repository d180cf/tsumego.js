module testbench {
    import stone = tsumego.stone;
    import Board = tsumego.Board;
    import DebugState = tsumego.DebugState;
    import solve = tsumego.solve;
    import benson = tsumego.benson;
    import mgen = tsumego.mgen;
    import TT = tsumego.TT;
    import hex = tsumego.hex;

    export function dbgsolve(board: Board, color: number, km: number, aim: stone, stubs: stone.Set, refresh: () => SVGGobanElement) {
        const debug: DebugState = {};
        const target = board.get(aim);

        for (const s of stubs)
            if (!board.play(stone.make(stone.x(s), stone.y(s), -target)))
                throw Error('Invalid stub: ' + stone.toString(s));

        board.drop();

        const solver = solve.start({
            debug: debug,
            board: board,
            color: color,
            km: km,
            tt: new TT,
            expand: mgen.fixed(board, aim),
            target: aim,
            alive: qargs.benson && ((b: Board) => benson.alive(b, aim))
        });

        window['solver'] = solver;
        window['debug'] = debug;

        let step = 0;
        let render = true;
        let isdone = false;
        let dbgbreak = false;

        const breakpoints: string[] & { matches?(): string } = [];

        breakpoints.matches = () => {
            for (const bp of breakpoints)
                if (bp == '@' + hex(board.hash) || bp == '#' + step)
                    return bp;

            return null;
        };

        function next() {
            const {done, value} = solver.next();
            const comment: string = (done ? 'result = ' + stone.toString(value) : value);

            if (done) {
                isdone = true;
                vm.dbg.inactive = true;
                console.log('result = ' + stone.toString(value));
            } else {
                step++;
            }

            if (render) {
                refresh();
                writeComment(comment);
            }

            return comment;
        }

        function run(stop = () => false) {
            const svg = refresh();

            render = false;
            dbgbreak = false;
            vm.note = 'solving...';

            let comment = '';

            const moves = [];
            const items: HTMLElement[] = [];

            (function fn() {
                const t = Date.now();

                while (!isdone && !dbgbreak && !breakpoints.matches() && !stop()) {
                    comment = next();

                    if (Date.now() > t + (qargs.freq || 250)) {
                        const newmoves = debug.moves.slice(0, qargs.depth || 4);

                        if (newmoves + '' != moves + '') {
                            moves.length = 0;
                            moves.push(...newmoves);

                            for (const item of items)
                                svg.removeChild(item);

                            items.length = 0;

                            for (let i = 0; i < newmoves.length; i++) {
                                const move = debug.moves[i];
                                const [x, y] = stone.coords(move);

                                if (stone.hascoords(move)) {
                                    const stone = (move > 0 ? svg.AB : svg.AW).add(x, y);
                                    const label = svg.LB.add(x, y, i + 1 + '');

                                    items.push(stone, label);
                                }
                            }
                        }

                        return setTimeout(fn);
                    }
                }

                render = true;
                writeComment(comment);
                refresh();
            })();
        }

        function writeComment(comment: string) {
            vm.note = [
                comment,
                '#' + step + ' @' + hex(board.hash),
                'color = ' + stone.label.string(debug.color),
                'km = ' + (debug.km && stone.label.string(debug.km)),
                'depth = ' + debug.depth,
            ].join('; ');
        }

        // "undo" the current move
        function stepOut() {
            const path = debug.moves;
            const n = path.length;

            run(() => path.length < n);
        }

        vm.dbg.stepInto.click(next);

        vm.dbg.stepOver.click(() => {
            stepOut();
            next();
        });

        vm.dbg.stepOut.click(stepOut);

        vm.dbg.run.click(() => {
            run();
        });

        vm.dbg.stop.click(() => {
            dbgbreak = true;
        });

        vm.dbg.bp.click(() => {
            const bp = (prompt('Pause at, e.g. @1bc4570f or #225') || '').trim();

            if (!bp)
                return;

            if (!/^#\d+|@[0-9a-f]{8}$/.test(bp)) {
                alert('Wrong bp format: ' + bp);
                return;
            }

            breakpoints.push(bp);
            vm.dbg.bp.css('color', 'red');
        });

        vm.note = stone.label.string(color) + ' to play, km = ' + (km && stone.label.string(km));
    }
}
