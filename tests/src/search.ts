module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import hex = tsumego.hex;
    import TT = tsumego.TT;
    import SGF = tsumego.SGF;
    import mgen = tsumego.mgen;
    import rand = tsumego.rand;

    ut.group($ => {
        /// the external interface

        $.test($ => {
            /// best move exists, black wins

            const move = solve('(;FF[4]SZ[5]PL[B]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// best move exists, white wins

            const move = solve('(;FF[4]SZ[5]PL[W]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// no best move exists, black wins

            const move = solve('(;FF[4]SZ[5]PL[W]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea][ba])');

            $(move).equal('B');
        });

        $.test($ => {
            /// no best move exists, white wins

            const move = solve('(;FF[4]SZ[5]PL[B]MA[bb]\
                AW[ab][bb][cb][db][da][ba]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('W');
        });

        $.test($ => {
            /// black is captured

            const move = solve('(;FF[4]SZ[5]PL[W]MA[bb]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// black lives

            const move = solve('(;FF[4]SZ[5]PL[B]MA[bb]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// black cannot be captured

            const move = solve('(;FF[4]SZ[5]PL[W]MA[bb]\
                AB[ab][bb][cb][db][da][ba]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            $(move).equal('B');
        });

        $.test($ => {
            /// invalid format

            const sgf = '(;FF[4]';
            const error = $.error(() => solve(sgf));

            $(error + '').equal('SyntaxError: Invalid SGF.');
        });

        $.test($ => {
            /// missing tags

            const sgf = '(;FF[4])';
            const error = $.error(() => solve(sgf));

            $(error + '').equal('SyntaxError: The SGF does not correctly describe a tsumego:'
                + '\n\tSZ[n] tag must specify the size of the board.'
                + '\n\tPL[W] or PL[B] must tell who plays first.'
                + '\n\tMA[xy] must specify the target white stone.');
        });

        $.test($ => {
            /// too big board size

            const sgf = '(;FF[4]SZ[19])';
            const error = $.error(() => solve(sgf));

            $(error + '').equal('SyntaxError: The SGF does not correctly describe a tsumego:'
                + '\n\tBoard 19x19 is too big. Up to 16x16 boards are supported.'
                + '\n\tPL[W] or PL[B] must tell who plays first.'
                + '\n\tMA[xy] must specify the target white stone.');
        });
    });

    ut.group($ => {
        /// tsumego samples

        if (typeof require === 'undefined')
            console.log('these tests are available only in node.js');

        const ls = require('glob').sync;
        const cat = require('fs').readFileSync;

        for (const path of ls('../problems/**/*.sgf')) try {
            const data = cat(path, 'utf8');
            const sgf = SGF.parse(data);

            if (!sgf)
                throw 'Invalid SGF';

            const setup = sgf.steps[0];

            // PL[] is used to disable/skip problems
            if (setup['PL'] && setup['PL'][0] == '')
                continue;

            if (!setup['MA'])
                throw 'MA[..] must tell what to capture';

            if (!setup['PL'])
                throw 'PL[..] must tell who plays first';

            if (sgf.vars.length < 1)
                throw 'No variations set';

            // moves marked as possible solutions in the problem
            const moves: { [move: string]: boolean } = {};

            for (const variation of sgf.vars) {
                const step = variation.steps[0];

                // e.g. B[ab] or W[ef]
                const move = step['B'] ? 'B[' + step['B'][0] + ']' :
                    step['W'] ? 'W[' + step['W'][0] + ']' :
                        null;

                moves[move] = true;
            }

            const color = stone.fromString(setup['PL'][0]); // who plays first
            const target = stone.fromString(setup['MA'][0]); // what to capture/save
            const board = new Board(sgf);
            const tblock = board.get(target);
            const tt = new TT; // shared by all variations

            $.test($ => {
                const b = board.fork();

                const result = solve({
                    root: b,
                    color: color,
                    tt: tt,
                    log: log,
                    expand: mgen.fixed(b, target),
                    status: (b: Board) => sign(b.get(target) || -tblock),
                    alive: (b: Board) => tsumego.benson.alive(b, target)
                });

                const move = stone.toString(result);

                if (!moves[move])
                    throw Error('Wrong move: ' + move);
            }, /\/problems\/(.+)\.sgf$/.exec(path)[1]);
        } catch (message) {
            console.log(path, message);
        }
    });
}