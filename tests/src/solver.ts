module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import s2n = tsumego.s2n;
    import s2xy = tsumego.s2xy;
    import xy2s = tsumego.xy2s;
    import TT = tsumego.TT;
    import BasicMoveGen = tsumego.generators.Basic;

    const f2xy = (s: string) => [s2n(s, 0), s2n(s, 1)];

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
            const [aimx, aimy] = f2xy(setup['MA'][0]);
            const rzone = setup['SL'].map(f2xy).map(m => stone(m[0], m[1]));
            const board = new Board(sgf);
            const tt = new TT<stone>();

            for (const variation of [null, ...sgf.vars]) {
                const solutions = variation ? variation.steps[0]['C'] : setup['C'];

                for (const config of solutions || []) {
                    const [lhs, rhs] = config.split(' => ');

                    if (!lhs || !rhs)
                        continue;

                    $.test($ => {
                        const b = board.fork();

                        if (variation) {
                            for (const [tag, color] of [['AB', +1], ['AW', -1]]) {
                                for (const xy of variation.steps[0][tag]) {
                                    const s = s2xy(xy, +color);

                                    if (!b.play(s))
                                        throw Error('Cannot play ' + stone.toString(s));
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
                        console.log('rand seed:', seed);

                        const result = solve({
                            root: b.fork(),
                            color: c2p == 'B' ? +1 : -1,
                            nkt: +nkt | 0,
                            tt: tt,
                            //htag: (b: Board) => b.fork(),
                            expand: BasicMoveGen(rzone, tsumego.rand.LCG.NR01(seed)),
                            status: (b: Board) => b.get(aimx, aimy) < 0 ? -1 : +1,
                            alive: (b: Board) => tsumego.benson.alive(b, stone(aimx, aimy))
                        });

                        console.log(b.hash + ' => ' + JSON.stringify(result));

                        try {
                            $(result.color > 0 ? 'B' : 'W').equal(winner);
                            $(xy2s(result.move)).belong(moves ? moves.split(',') : [null]);
                        } catch (err) {
                            const tt2 = new TT<stone>();

                            const result2 = solve({
                                root: b.fork(),
                                color: c2p == 'B' ? +1 : -1,
                                nkt: +nkt | 0,
                                tt: tt2,
                                htag: (b: Board) => b.fork(),
                                expand: BasicMoveGen(rzone, tsumego.rand.LCG.NR01(seed)),
                                status: (b: Board) => b.get(aimx, aimy) < 0 ? -1 : +1,
                                alive: (b: Board) => tsumego.benson.alive(b, stone(aimx, aimy))
                            });

                            console.log(b.hash + ' => ' + JSON.stringify(result2));

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
                                    tt: new TT<stone>(),
                                    expand: BasicMoveGen(rzone, tsumego.rand.LCG.NR01(seed)),
                                    status: (b: Board) => b.get(aimx, aimy) < 0 ? -1 : +1,
                                    alive: (b: Board) => tsumego.benson.alive(b, stone(aimx, aimy))
                                });

                                if (!r1 != !r2 || r1.color != r2.color) {
                                    console.log(hash, color, nkt);
                                    console.log('r1 = ' + JSON.stringify(r1));
                                    console.log('r2 = ' + JSON.stringify(r2));
                                    console.log(b + '\n');

                                    if (nn++ > 3) break;
                                }
                            }

                            console.log(nn);

                            throw err;
                        }
                    }, /\/problems\/(.+)\.sgf$/.exec(path)[1] + ' [' + config + ']');
                }
            }
        }
    });
}