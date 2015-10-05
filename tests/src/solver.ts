module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import s2n = tsumego.s2n;
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
            const rzone = setup['DD'].map(f2xy).map(m => stone(m[0], m[1]));
            const board = new Board(sgf);
            const tt = new TT<stone>();

            for (const config of setup['TEST'] || []) {
                const [lhs, rhs] = config.split(' => ');
                const [c2p, nkt] = /(\w)([+-].+)?/.exec(lhs).slice(1);
                const [winner, moves] = rhs.split('+');

                $.test($ => {
                    console.log(board + '');
                    console.log(c2p + ' plays first');

                    if (nkt)
                        console.log(`${+nkt > 0 ? 'B' : 'W'} has ${Math.abs(+nkt) } ko treats`);

                    const seed = Date.now();
                    console.log('rand seed:', seed);

                    const result = solve({
                        root: board,
                        color: c2p == 'B' ? +1 : -1,
                        nkt: +nkt | 0,
                        tt: tt,
                        expand: BasicMoveGen(rzone, tsumego.rand.LCG.NR01(seed)),
                        status: (b: Board) => b.get(aimx, aimy) < 0 ? -1 : +1,
                        alive: (b: Board) => tsumego.benson.alive(b, stone(aimx, aimy))
                    });

                    console.log('result:', JSON.stringify(result));

                    $(result.color > 0 ? 'B' : 'W').equal(winner);
                    $(xy2s(result.move)).belong(moves ? moves.split(',') : [null]);
                }, /\/problems\/(.+)\.sgf$/.exec(path)[1] + ':' + lhs);
            }
        }
    });
}