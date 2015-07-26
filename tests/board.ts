/// <reference path="infra.ts" />

module tests {
    import Board = tsumego.Board;

    ut.group($ => { 
        /// board
        $.test($ => { 
            /// empty 3x3
            const board = new Board(3);

            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
            $(board.toString()).equal('   A\n 1 -');
            $(board.hash()).equal('3x3()');
        });

        $.test($ => { 
            /// 5x5 with a stone
            const board = new Board(5);
            board.play(2, 2, +1);

            $(board.toString('SGF')).equal('(;FF[4]SZ[5]AB[cc])');
            $(board.toString()).equal('   A B C\n 1 - - -\n 2 - - -\n 3 - - X');
            $(board.hash()).equal('5x5(;;--X)');
        });

        $.test($ => { 
            /// empty 3x3 from sgf
            const board = new Board(`(;FF[4]SZ[3])`);
            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
        });

        $.test($ => { 
            /// serialization
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
            /// 9x9 from txt to txt
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
            /// total libs
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

        $.test($ => { 
            /// capture
            const b = new Board(9, [
                'X-XXOOOO',
                'XX-XXOOX',
                '--XOO-OX',
                '--XOOOXX',
                '---XXX--']);

            const n = b.play(5, 2, +1);

            // board is 9x9 so the rightmost column is empty
            $(n).equal(5 + 1);

            $(b + '').equal(
                '   A B C D E F G H\n' +
                ' 1 X - X X O O O O\n' +
                ' 2 X X - X X O O X\n' +
                ' 3 - - X - - X O X\n' +
                ' 4 - - X - - - X X\n' +
                ' 5 - - - X X X - -');
        });
    });
}