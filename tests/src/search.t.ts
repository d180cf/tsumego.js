module tests {
    import Board = tsumego.Board;
    import solve = tsumego.solve;
    import stone = tsumego.stone;
    import hex = tsumego.hex;
    import SGF = tsumego.SGF;
    import rand = tsumego.rand;

    ut.group($ => {
        /// tsumego samples

        if (typeof require === 'undefined')
            console.log('these tests are available only in node.js');

        const ls = require('glob').sync;
        const cat = require('fs').readFileSync;

        for (const path of ls('../problems/**/*.sgf')) {
            const data = cat(path, 'utf8');
            const sgf = SGF.parse(data);

            if (!sgf)
                throw SyntaxError('Invalid SGF');

            const setup = sgf.steps[0];

            if (!setup['PL'])
                continue;

            const color = stone.label.color(setup['PL'][0]); // who plays first

            if (!color)
                continue;

            if (sgf.vars.length < 1)
                continue;

            $.test($ => {
                // moves marked as possible solutions in the problem
                interface MTree { [move: string]: MTree }
                const tree: MTree = {};

                (function read(tree: MTree, root: SGF.Node) {
                    for (const node of root.vars) {
                        let leaf = tree;

                        for (const step of node.steps) {
                            // e.g. B[ab] or W[ef]
                            const move = step['B'] ? 'B[' + step['B'][0] + ']' :
                                step['W'] ? 'W[' + step['W'][0] + ']' :
                                    null;

                            if (leaf[move])
                                throw Error('Conflicting move: ' + move);

                            leaf = leaf[move] = {};
                        }

                        read(leaf, node);
                    }
                })(tree, sgf);

                //console.log('mtree:');
                //console.tree(tree);

                const p = new tsumego.Solver(data);
                const seq: string[] = []; // e.g. [W[ef], B[ab], W[cc]]

                (function playout(root) {
                    const moves = Object.keys(root); // e.g. [W[ef], W[cc]]

                    if (moves.length < 1)
                        return;

                    // there is an assumption here that all the moves at one level
                    // are either B[..] or W[..]
                    if (stone.fromString(moves[0]) * color < 0) {
                        for (const move of moves) {
                            if (!p.play(stone.fromString(move)))
                                throw Error('Illegal move: ' + [...seq, move.white()].join(';') + move + '\n' + p);

                            seq.push(move);
                            playout(root[move]);
                            p.undo();
                            seq.pop();
                        }
                    } else {
                        const g = p.g_solve(color, {
                            time: 1000,
                            log: argv.log && log,
                            eulern: argv.eulern,
                            npeyes: argv.npeyes,
                            benson: argv.benson,
                        });

                        const t = Date.now();

                        let r: stone;

                        while (true) {
                            const {done, value} = g.next();

                            if (done) {
                                r = value;
                                break;
                            }

                            if (Date.now() > t + 60 * 1000)
                                throw Error('Timed out');
                        }

                        const move = stone.toString(r);

                        if (!root[move])
                            throw Error('Wrong move: ' + [...seq, move.white()].join(';') + '. Expected: ' + moves + '\n'
                                + p.toString().replace(/X/img, s => s.green()).replace(/O/img, s => s.white()));

                        if (!p.play(r))
                            throw Error('Illegal move: ' + [...seq, move.white()].join(';') + move + '\n' + p);

                        seq.push(move);
                        playout(root[move]);
                        p.undo();
                        seq.pop();
                    }
                })(tree);
            }, /\/problems\/(.+)\.sgf$/.exec(path)[1]);
        }
    });
}