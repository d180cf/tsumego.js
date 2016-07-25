module tests {
    import Board = tsumego.Board;
    import stone = tsumego.stone;
    import mgen = tsumego.mgen;

    ut.group($ => {
        /// mgen.dist

        const _test = (color: number, target: string, dist: number, rows: string[], title: string) => $.test($ => {
            const n = Math.max(rows.length, rows.reduce((n, s) => Math.max(n, s.split(' ').length), 0));
            const b = new Board(n, rows);
            const t = stone.fromString(target);
            const m = mgen.dist(b, t, dist)(color);
            const h = new CharBoard(n);

            let mismatches = 0;

            for (let x = 0; x < n; x++) {
                for (let y = 0; y < n; y++) {
                    const expected = (rows[y] || '').split(' ')[x] || '-';

                    const actual = m.indexOf(stone.make(x, y, color)) >= 0 ? '+' :
                        b.get(x, y) > 0 ? 'X' : b.get(x, y) < 0 ? 'O' : '-';

                    h.set(x, y, actual, expected != actual ? AnsiEscapeCode.red :
                        actual == 'X' ? AnsiEscapeCode.white : 0);

                    if (actual != expected)
                        mismatches++;
                }
            }

            if (mismatches) {
                console.log('some cells mismatched:\n' + h);
                throw Error('Wrong set of moves: ' + mismatches);
            }
        }, title);

        $.test($ => {
            /// d=1 one stone

            const b = new Board(3);

            for (let x = 0; x < 3; x++) {
                for (let y = 0; y < 3; y++) {
                    const t = stone.make(x, y, +1);

                    b.play(t);

                    const g = mgen.dist(b, t, 1);

                    const _n = Array.from(b.libs(b.get(x, y))).map(([x, y]) => x | y << 4).sort();
                    const _b = g(+1).map(s => s & 0xFFFF).sort();
                    const _w = g(-1).map(s => s & 0xFFFF).sort();

                    b.undo();

                    console.log(x, y, _n, _b, _w);

                    $(_n).equal(_b);
                    $(_n).equal(_w);
                }
            }
        });

        $.test($ => {
            /// d=1 blocks

            const b = new Board(5, [
                '- - O - -',
                'X X O X X',
                '- - O O -',
                '- O X - -',
                '- X X - -',
            ]);

            for (let x = 0; x < b.size; x++) {
                for (let y = 0; y < b.size; y++) {
                    const g = mgen.dist(b, stone.make(x, y, 0), 1);

                    const _n = Array.from(b.libs(b.get(x, y))).map(([x, y]) => x | y << 4).sort();
                    const _b = g(+1).map(s => s & 0xFFFF).sort();
                    const _w = g(-1).map(s => s & 0xFFFF).sort();

                    console.log(x, y, _n, _b, _w);

                    $(_n).equal(_b);
                    $(_n).equal(_w);
                }
            }
        });

        $.test($ => {
            /// d=1 atari

            const b = new Board(5, [
                '- - - O -',
                '- - O X X',
                '- - O O -',
                '- - - - -',
                '- - - - -',
            ]);


            const g = mgen.dist(b, stone.make(3, 1, 0), 1);

            const _b = g(+1).map(s => s & 0xFFFF).sort();
            const _w = g(-1).map(s => s & 0xFFFF).sort();

            $(_b).equal([0x24]);
            $(_w).equal([0x24, 0x04]);
        });

        $.test($ => {
            /// d=1 capture

            const b = new Board(5, [
                '- - - O O',
                '- - O X X',
                '- - O O -',
                '- - - - -',
                '- - - - -',
            ]);


            const g = mgen.dist(b, stone.make(3, 1, 0), 1);

            const _b = g(+1).map(s => s & 0xFFFF).sort();
            const _w = g(-1).map(s => s & 0xFFFF).sort();

            console.log(_b, _w);

            $(_b).equal([0x02]);
            $(_w).equal([0x02, 0x24]);
        });

        $.test($ => {
            /// d=1 poke

            const b = new Board(5, [
                '- - O X -',
                '- - O X X',
                '- - - O O',
                '- - - - -',
                '- - - - -',
            ]);


            const g = mgen.dist(b, stone.make(3, 1, 0), 1);

            const _b = g(+1).map(s => s & 0xFFFF).sort();
            const _w = g(-1).map(s => s & 0xFFFF).sort();

            console.log(_b, _w);

            $(_b).equal([]);
            $(_w).equal([0x04]);
        });

        $.test($ => {
            /// d=1 ko

            const b = new Board(5, [
                'O - O X -',
                'O O X X X',
                '- - O O O',
                '- - - - -',
                '- - - - -',
            ]);


            const g = mgen.dist(b, stone.make(3, 1, 0), 1);

            const _b = g(+1).map(s => s & 0xFFFF).sort();
            const _w = g(-1).map(s => s & 0xFFFF).sort();

            console.log(_b, _w);

            $(_b).equal([0x01]);
            $(_w).equal([0x01, 0x04]);
        });

        _test(+1, 'bb', 2, [
            '+ X + + -',
            '+ X + + -',
            '+ + + - -',
            '- + - - -',
            '- - - - -',
        ], 'd=2 simple');

        _test(+1, 'bb', 2, [
            '- X + + -',
            'X X + + -',
            '+ + + - -',
            '+ + - - -',
            '- - - - -',
        ], 'd=2 eye');

        _test(+1, 'bb', 2, [
            '+ X + + -',
            '+ X + O -',
            '+ + + - -',
            '- O O - -',
            '- - - - -',
        ], 'd=2 obstacle');

        _test(+1, 'bb', 2, [
            '+ X + + -',
            '+ X X + +',
            '+ X O + -',
            '+ + + - -',
            '- + - - -',
        ], 'd=2 capture');

        _test(+1, 'bb', 2, [
            '+ X + + -',
            '+ X + + -',
            '+ + X + -',
            '- + + - -',
            '- - - - -',
        ], 'd=2 connect');

        _test(+1, 'bc', 2, [
            '- + - + -',
            '+ + + X +',
            '+ X + X +',
            '+ + + X +',
            '- + - + -',
        ], 'd=2 connect 2');

        _test(+1, 'cc', 2, [
            '- X + + - - -',
            'X X X O - - -',
            'O O X O - - -',
            '+ + O + - - -',
            '- - X - - - -',
            '- - - - - - -',
            '- - - - - - -',
        ], 'd=2 holes in the wall');

        _test(+1, 'cc', 2, [
            '- X + + - - -',
            'X X X O - - -',
            'O O X O - - -',
            '- + O O - - -',
            '- - - - - - -',
            '- - - - - - -',
            '- - - - - - -',
        ], 'd=3 overplay');

        _test(+1, 'cc', 3, [
            '+ + + + - - -',
            '+ + X O - - -',
            '+ X X O - - -',
            '+ O O - - - -',
            '- - - - - - -',
            '- - - - - - -',
            '- - - - - - -',
        ], 'd=3 block');

        _test(+1, 'df', 3, [
            '- - - - - - -',
            '- - - - - - -',
            '- - - - - - -',
            '- - - X - - -',
            '- - - O - - -',
            'O O O X O O O',
            '- - + X + - -',
        ], 'd=3 false hole');

        _test(+1, 'db', 3, [
            '+ + + + + + +',
            '+ + X X X + +',
            'O O O + O O O',
            '- - - - - - -',
            '- - - - - - -',
            '- - - - - - -',
            '- - - - - - -',
        ], 'd=3 catch');

        _test(+1, 'bb', 3, [
            '+ + + + + - - - -',
            '+ X X X O - O - -',
            '+ O O O O - - - -',
            '- - - - - - - - -',
            '- O - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
        ], 'd=3 common catch');

        _test(+1, 'bb', 3, [
            '+ + + + + - - - -',
            '+ X X X O - O - -',
            'X O O O O - - - -',
            'O - - - - - - - -',
            '- O - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
        ], 'd=3 common block');

        _test(+1, 'bb', 3, [
            '+ + + + + - - - -',
            '+ X X + + + - - -',
            '+ + + + X X + - -',
            '+ + + + + + - - -',
            '- + + - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
            '- - - - - - - - -',
        ], 'd=3 connect');

        // see how B[fb] is blocked by W[db]:
        // once W plays there, d(fb) = 4
        _test(+1, 'bb', 3, [
            '+ + + + + - - - -',
            '+ X X + + - - - -',
            '+ + + + + - - - -',
            '+ + X X + + - - -',
            '- + + + + - - - -',
            '- - + X X + - - -',
            '- - - + + - - - -',
            '- - - - X X - - -',
            '- - - - - - - - -',
        ], 'd=3 connect twice');
    });
}
