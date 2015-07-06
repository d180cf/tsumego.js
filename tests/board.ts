/// <reference path="ut.ts" />

module tests {
    import Board = tsumego.Board;

    ut.group($ => {
        $.test($ => {
            const board = new Board(3);

            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
            $(board.toString()).equal('   A\n 1 -');
            $(board.hash()).equal('3x3()');
        });

        $.test($ => {
            const board = new Board(5);
            board.play(2, 2, +1);

            $(board.toString('SGF')).equal('(;FF[4]SZ[5]AB[cc])');
            $(board.toString()).equal('   A B C\n 1 - - -\n 2 - - -\n 3 - - X');
            $(board.hash()).equal('5x5(;;--X)');
        });

        $.test($ => {
            const board = new Board(`(;FF[4]SZ[3])`);
            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
        });

        $.test($ => {
            const board = new Board(`
           (;FF[4]SZ[9]
             AW[bb][cb][cc][cd][de][df][cg][ch][dh][ai][bi][ci]
             AB[ba][ab][ac][bc][bd][be][cf][bg][bh])`);

            $(board.toString('SGF')).equal('(;FF[4]SZ[9]'
                + 'AB[ba][ab][ac][bc][bd][be][cf][bg][bh]'
                + 'AW[bb][cb][cc][cd][de][df][cg][ch][dh][ai][bi][ci])');

            $(board.toString()).equal([
                '   A B C D',
                ' 1 - X - -',
                ' 2 X O O -',
                ' 3 X X O -',
                ' 4 - X O -',
                ' 5 - X - O',
                ' 6 - - X O',
                ' 7 - X O -',
                ' 8 - X O O',
                ' 9 O O O -'
            ].join('\n'));

            $(board.hash()).equal('9x9(-X;XOO;XXO;-XO;-X-O;--XO;-XO;-XOO;OOO)');
        });

        $.test($ => {
            const board = new Board(9, [
                '-X--',
                'XOO-',
                'XXO-',
                '-XO-',
                '-X-O',
                '--XO',
                '-XO-',
                '-XOO',
                'OOO-'
            ]);

            $(board + '').equal([
                '   A B C D',
                ' 1 - X - -',
                ' 2 X O O -',
                ' 3 X X O -',
                ' 4 - X O -',
                ' 5 - X - O',
                ' 6 - - X O',
                ' 7 - X O -',
                ' 8 - X O O',
                ' 9 O O O -'
            ].join('\n'));
        });

        $.test($ => {
            const b = new Board(5);

            $(b.totalLibs(+1)).equal(0);
            $(b.totalLibs(-1)).equal(0);

            b.play(0, 0, +1);

            $(b.totalLibs(+1)).equal(2);
            $(b.totalLibs(-1)).equal(0);

            b.play(1, 0, +1);

            $(b.totalLibs(+1)).equal(3);
            $(b.totalLibs(-1)).equal(0);

            b.play(4, 0, +1);

            $(b.totalLibs(+1)).equal(5);
            $(b.totalLibs(-1)).equal(0);

            b.play(3, 0, +1);

            $(b.totalLibs(+1)).equal(5);
            $(b.totalLibs(-1)).equal(0);

            b.play(2, 0, +1);

            $(b.totalLibs(+1)).equal(5);
            $(b.totalLibs(-1)).equal(0);

            b.play(0, 1, -1);

            $(b.totalLibs(+1)).equal(4);
            $(b.totalLibs(-1)).equal(2);

            b.play(1, 1, -1);

            $(b.totalLibs(+1)).equal(3);
            $(b.totalLibs(-1)).equal(3);

            b.play(4, 1, -1);

            $(b.totalLibs(+1)).equal(2);
            $(b.totalLibs(-1)).equal(5);

            b.play(3, 1, -1);

            $(b.totalLibs(+1)).equal(1);
            $(b.totalLibs(-1)).equal(5);

            b.play(2, 1, -1);

            $(b.totalLibs(+1)).equal(0);
            $(b.totalLibs(-1)).equal(10);
        });
    });
}