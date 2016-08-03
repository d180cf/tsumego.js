module tests {
    import Board = tsumego.Board;
    import stone = tsumego.stone;
    import mgen = tsumego.mgen;

    ut.group($ => {
        /// mgen.fixed

        $.test($ => {
            /// simple libs

            const b = new Board(5, [
                '- O - X -',
                'X X - X -',
                '- X X X -',
                '- - - - -',
                '- - - - -',
            ]);

            const g = mgen.fixed(b, stone.make(1, 0, 0));
            const z = g(+1).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x00, 0x02, 0x12]);
        });

        $.test($ => {
            /// diag moves

            const b = new Board(5, [
                '- O X X -',
                'X X - X -',
                '- X - X -',
                '- X X X -',
                '- - - - -',
            ]);

            const g = mgen.fixed(b, stone.make(1, 0, 0));
            const z = g(+1).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x00, 0x12, 0x22]);
        });

        $.test($ => {
            /// a few groups

            const b = new Board(5, [
                '- O - O -',
                '- O - O -',
                'X X X X X',
                '- - - - -',
                '- - - - -',
            ]);

            const g = mgen.fixed(b, stone.make(1, 0, 0));
            const z = g(+1).filter(s => !b.get(s)).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x00, 0x02, 0x04, 0x10, 0x12, 0x14]);
        });

        $.test($ => {
            /// inner stones

            const b = new Board(5, [
                'O X X O X',
                '- O - O X',
                'X X X X X',
                '- - - - -',
                '- - - - -',
            ]);

            const g = mgen.fixed(b, stone.make(1, 1, 0));

            b.play(stone.make(2, 1, -1));

            const z = g(+1).filter(s => !b.get(s)).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x01, 0x02, 0x10]);
        });

        $.test($ => {
            /// inner eye

            const b = new Board(7, [
                'O - X O X',
                'X X X O X',
                'O O O O X',
                '- - - X X',
                'X X X X -',
            ]);

            const g = mgen.fixed(b, stone.make(0, 2, 0));
            const z = g(-1).filter(s => !b.get(s)).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x01, 0x30, 0x31, 0x32]);
        });

        $.test($ => {
            /// sample 1

            const b = new Board(9, [
                '- - O O X - X',
                'X O - - O X X',
                '- X O O O X',
                'X - O X X X',
                '- X X X - -',
                'X X - - - -'
            ]);

            const g = mgen.fixed(b, stone.make(2, 2, 0));
            const z = g(+1).filter(s => !b.get(s)).map(x => x & 0xFF).sort((a, b) => a - b);

            console.log(z);

            $(z).equal([0x00, 0x01, 0x05, 0x12, 0x13, 0x20, 0x31, 0x40]);
        });
    });
}
