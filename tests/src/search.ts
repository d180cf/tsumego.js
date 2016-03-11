module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import hex = tsumego.hex;
    import TT = tsumego.TT;
    import BasicMoveGen = tsumego.generators.Basic;
    import rand = tsumego.rand;

    ut.group($ => {
        /// the external interface

        $.test($ => {
            /// best move exists, black wins

            const move = solve('(;FF[4]SZ[5]PL[B]MA[ba]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// best move exists, white wins

            const move = solve('(;FF[4]SZ[5]PL[W]MA[ba]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// no best move exists, black wins

            const move = solve('(;FF[4]SZ[5]PL[W]MA[ba]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea][ba]\
                SQ[aa][ba][ca])');

            $(move).equal('B');
        });

        $.test($ => {
            /// no best move exists, white wins

            const move = solve('(;FF[4]SZ[5]PL[B]MA[ba]\
                AW[ab][bb][cb][db][da][ba]\
                AB[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

            $(move).equal('W');
        });

        $.test($ => {
            /// black is captured

            const move = solve('(;FF[4]SZ[5]PL[W]MA[ba]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// black lives

            const move = solve('(;FF[4]SZ[5]PL[B]MA[ba]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// black cannot be captured

            const move = solve('(;FF[4]SZ[5]PL[W]MA[ba]\
                AB[ab][bb][cb][db][da][ba]\
                AW[ac][bc][cc][dc][ec][eb][ea]\
                SQ[aa][ba][ca])');

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
                + '\n\tSQ[xy][..] must tell the set of possible moves.'
                + '\n\tMA[xy] must specify the target white stone.');
        });

        $.test($ => {
            /// too big board size

            const sgf = '(;FF[4]SZ[19])';
            const error = $.error(() => solve(sgf));

            $(error + '').equal('SyntaxError: The SGF does not correctly describe a tsumego:'
                + '\n\tBoard 19x19 is too big. Up to 16x16 boards are supported.'
                + '\n\tPL[W] or PL[B] must tell who plays first.'
                + '\n\tSQ[xy][..] must tell the set of possible moves.'
                + '\n\tMA[xy] must specify the target white stone.');
        });
    });

    ut.group($ => {
        /// tsumego samples

        if (typeof require === 'undefined')
            console.log('these tests are available only in node.js');

        const ls = require('glob').sync;
        const cat = require('fs').readFileSync;

        for (const path of ls('../problems/**/*.sgf')) {
            const data = cat(path, 'utf8');
            const sgf = tsumego.SGF.parse(data);

            if (!sgf) {
                console.log('Invalid SGF: ' + path);
                continue;
            }

            const setup = sgf.steps[0];

            if (!setup['MA'] || !setup['SL'])
                continue;

            const aim = stone.fromString(setup['MA'][0]);
            const rzone = setup['SL'].map(stone.fromString);
            const board = new Board(sgf);
            const tt = new TT; // shared by all variations

            for (const variation of [null, ...sgf.vars]) {
                const solutions = variation ? variation.steps[0]['C'] : setup['C'];

                for (const config of solutions || []) {
                    const [lhs, rhs] = config.split(' => ');

                    if (!lhs || !rhs)
                        continue;

                    $.test($ => {
                        const b = board.fork();

                        if (variation) {
                            for (const tag of ['AB', 'AW']) {
                                for (const xy of variation.steps[0][tag]) {
                                    const s = tag[1] + '[' + xy + ']';

                                    if (!b.play(stone.fromString(s)))
                                        throw Error('Cannot play ' + s);
                                }
                            }
                        }

                        const [c2p, nkt] = /(\w)([+-].+)?/.exec(lhs).slice(1);
                        const [winner, moves] = rhs.split('+');

                        console.log(b + '');
                        console.log(c2p + ' plays first');

                        if (nkt)
                            console.log(`${+nkt > 0 ? 'B' : 'W'} has ${Math.abs(+nkt) } ko treats`);

                        const seed = Date.now() | 0;
                        console.log('rand seed:', hex(seed));

                        const unodes = { total: 0, unique: 0 };

                        const result = solve({
                            root: b.fork(),
                            color: c2p == 'B' ? +1 : -1,
                            nkt: +nkt | 0,
                            tt: tt,
                            unodes: unodes,
                            expand: BasicMoveGen(rzone),
                            status: (b: Board) => b.get(aim) < 0 ? -1 : +1,
                            alive: (b: Board) => tsumego.benson.alive(b, aim)
                        });

                        console.log(hex(b.hash) + ' => ' + stone.toString(result) + ' (found solution)');

                        $(stone.color(result)).equal(winner == 'B' ? +1 : -1);
                        const [x, y] = stone.coords(result);
                        const move = !stone.hascoords(result) ? 0 : stone(x, y, 0);
                        $(stone.toString(move)).belong(moves ? moves.split(',') : [null]);

                        return unodes.unique + '/' + unodes.total;
                    }, /\/problems\/(.+)\.sgf$/.exec(path)[1] + ' [' + config + ']');
                }
            }
        }
    });
}