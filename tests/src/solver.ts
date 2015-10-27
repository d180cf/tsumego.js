module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import hex = tsumego.hex;
    import TT = tsumego.TT;
    import BasicMoveGen = tsumego.generators.Basic;
    import srand = tsumego.rand.LCG.NR01;

    ut.group($ => {
        /// tsumego samples

        if (typeof require === 'undefined')
            console.log('these tests are available only in node.js');

        const ls = require('glob').sync;
        const cat = require('fs').readFileSync;

        for (const path of ls('../problems/**/*.sgf')) {
            const data = cat(path, 'utf8');
            const sgf = SGF.parse(data);

            const setup = sgf.steps[0];
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

                        const result = solve({
                            root: b.fork(),
                            color: c2p == 'B' ? +1 : -1,
                            nkt: +nkt | 0,
                            tt: tt,
                            //htag: (b: Board) => b.fork(),
                            expand: BasicMoveGen(rzone, srand(seed)),
                            status: (b: Board) => b.get(aim) < 0 ? -1 : +1,
                            alive: (b: Board) => tsumego.benson.alive(b, aim)
                        });

                        console.log(hex(b.hash) + ' => ' + stone.toString(result) + ' (found solution)');

                        try {
                            $(stone.color(result)).equal(winner == 'B' ? +1 : -1);
                            const [x, y] = stone.coords(result);
                            const move = !stone.hascoords(result) ? 0 : stone(x, y, 0);
                            $(stone.toString(move)).belong(moves ? moves.split(',') : [null]);
                        } catch (err) {
                            const tt2 = new TT;

                            const result2 = solve({
                                root: b.fork(),
                                color: c2p == 'B' ? +1 : -1,
                                nkt: +nkt | 0,
                                tt: tt2,
                                htag: (b: Board) => b.fork(),
                                expand: BasicMoveGen(rzone, srand(seed)),
                                status: (b: Board) => b.get(aim) < 0 ? -1 : +1,
                                alive: (b: Board) => tsumego.benson.alive(b, aim)
                            });

                            console.log(hex(b.hash) + ' => ' + stone.toString(result2) + ' (expected solution)');

                            console.log('wrong tt entires:');

                            let nn = 0;

                            for (const {hash, color, status: {htag}} of tt) {
                                const b: Board = htag;
                                const nkt = +1;
                                const r1 = tt.get(hash, color, nkt);

                                if (!r1) continue;

                                const r2 = solve({
                                    root: b.fork(),
                                    color: color,
                                    nkt: nkt,
                                    tt: new TT,
                                    expand: BasicMoveGen(rzone, tsumego.rand.LCG.NR01(seed)),
                                    status: (b: Board) => b.get(aim) < 0 ? -1 : +1,
                                    alive: (b: Board) => tsumego.benson.alive(b, aim)
                                });

                                if (stone.color(r1) != stone.color(r2)) {
                                    console.log(hash, color, nkt);
                                    console.log('r1 = ' + JSON.stringify(r1));
                                    console.log('r2 = ' + JSON.stringify(r2));
                                    console.log(b + '\n');

                                    if (nn++ > 3) break;
                                }
                            }

                            console.log(nn || 'no wrong tt entires found');

                            throw err;
                        }
                    }, /\/problems\/(.+)\.sgf$/.exec(path)[1] + ' [' + config + ']');
                }
            }
        }
    });
}