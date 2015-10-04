/// <reference path="infra.ts" />

module tests {
    import stone = tsumego.stone;
    import block = tsumego.block;
    import sumlibs = tsumego.sumlibs;
    import Board = tsumego.Board;

    ut.group($ => { 
        /// board

        $.test($ => {
            /// blocks
            const b = new Board(5);

            const moves: [string, number, () => void][] = [
                ['+A5', 1, () => {
                    $(b.toString()).equal([
                        '   A',
                        ' 5 X',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=2 size=1'
                    ]);
                }],

                ['-B5', 1, () => {
                    $(b.toString()).equal([
                        '   A B',
                        ' 5 X O',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 1]x[0, 0] libs=2 size=1'
                    ]);
                }],

                ['+B4', 1, () => {
                    $(b.toString()).equal([
                        '   A B',
                        ' 5 X O',
                        ' 4 - X',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 1]x[0, 0] libs=1 size=1',
                        '+[1, 1]x[1, 1] libs=3 size=1'
                    ]);
                }],

                ['-C5', 1, () => {
                    $(b.toString()).equal([
                        '   A B C',
                        ' 5 X O O',
                        ' 4 - X -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[1, 1]x[1, 1] libs=3 size=1'
                    ]);
                }],

                ['+A4', 1, () => {
                    $(b.toString()).equal([
                        '   A B C',
                        ' 5 X O O',
                        ' 4 X X -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0'
                    ]);
                }],

                ['-E5', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1'
                    ]);
                }],

                ['+A1', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - - - -',
                        ' 2 - - - - -',
                        ' 1 X - - - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                    ]);
                }],

                ['-D2', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - - - -',
                        ' 2 - - - O -',
                        ' 1 X - - - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[3, 3]x[3, 3] libs=4 size=1',
                    ]);
                }],

                ['-B2', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - - - -',
                        ' 2 - O - O -',
                        ' 1 X - - - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[3, 3]x[3, 3] libs=4 size=1',
                        '-[1, 1]x[3, 3] libs=4 size=1',
                    ]);
                }],

                ['-C3', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - O - -',
                        ' 2 - O - O -',
                        ' 1 X - - - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[3, 3]x[3, 3] libs=4 size=1',
                        '-[1, 1]x[3, 3] libs=4 size=1',
                        '-[2, 2]x[2, 2] libs=4 size=1',
                    ]);
                }],

                ['-C1', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - O - -',
                        ' 2 - O - O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[3, 3]x[3, 3] libs=4 size=1',
                        '-[1, 1]x[3, 3] libs=4 size=1',
                        '-[2, 2]x[2, 2] libs=4 size=1',
                        '-[2, 2]x[4, 4] libs=3 size=1',
                    ]);
                }],

                ['+C2', 0, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - O - -',
                        ' 2 - O - O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[3, 3]x[3, 3] libs=4 size=1',
                        '-[1, 1]x[3, 3] libs=4 size=1',
                        '-[2, 2]x[2, 2] libs=4 size=1',
                        '-[2, 2]x[4, 4] libs=3 size=1',
                    ]);
                }],

                ['-C2', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X - - -',
                        ' 3 - - O - -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[1, 3]x[2, 4] libs=7 size=5',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                    ]);
                }],

                ['+D5', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X O',
                        ' 4 X X - - -',
                        ' 3 - - O - -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=1 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        '-[4, 4]x[0, 0] libs=1 size=1',
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[1, 3]x[2, 4] libs=7 size=5',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                    ]);
                }],

                ['+E4', 2, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X - - X',
                        ' 3 - - O - -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=1 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[1, 3]x[2, 4] libs=7 size=5',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=2 size=1',
                        '+[4, 4]x[1, 1] libs=3 size=1',
                    ]);
                }],

                ['-D4', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X - O X',
                        ' 3 - - O - -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=1 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[1, 3]x[2, 4] libs=7 size=5',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[4, 4]x[1, 1] libs=2 size=1',
                        '-[3, 3]x[1, 1] libs=2 size=1',
                    ]);
                }],

                ['+D3', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X - O X',
                        ' 3 - - O X -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=1 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '-[1, 3]x[2, 4] libs=6 size=5',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[4, 4]x[1, 1] libs=2 size=1',
                        '-[3, 3]x[1, 1] libs=1 size=1',
                        '+[3, 3]x[2, 2] libs=1 size=1',
                    ]);
                }],

                ['-C4', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X O O X',
                        ' 3 - - O X -',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 3]x[0, 4] libs=5 size=9',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[4, 4]x[1, 1] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[3, 3]x[2, 2] libs=1 size=1',
                    ]);
                }],

                ['+E3', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X O O X',
                        ' 3 - - O X X',
                        ' 2 - O O O -',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 3]x[0, 4] libs=5 size=9',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[3, 4]x[1, 2] libs=2 size=3',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                    ]);
                }],

                ['-E2', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X O O X',
                        ' 3 - - O X X',
                        ' 2 - O O O O',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 4]x[0, 4] libs=5 size=10',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[3, 4]x[1, 2] libs=1 size=3',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                    ]);
                }],

                ['+E5', 0, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X O O X',
                        ' 3 - - O X X',
                        ' 2 - O O O O',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 4]x[0, 4] libs=5 size=10',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                        '+[3, 4]x[1, 2] libs=1 size=3',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                    ]);
                }],

                ['-E5', 5, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X O O -',
                        ' 3 - - O - -',
                        ' 2 - O O O O',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 4]x[0, 4] libs=9 size=10',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        null,
                        null,
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                        '-[4, 4]x[0, 0] libs=2 size=1',
                    ]);
                }],

                ['+E4', 1, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O - O',
                        ' 4 X X O O X',
                        ' 3 - - O - -',
                        ' 2 - O O O O',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 4]x[0, 4] libs=8 size=10',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        null,
                        null,
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                        '-[4, 4]x[0, 0] libs=1 size=1',
                        '+[4, 4]x[1, 1] libs=1 size=1',
                    ]);
                }],

                ['+D5', 2, () => {
                    $(b.toString()).equal([
                        '   A B C D E',
                        ' 5 X O O X -',
                        ' 4 X X O O X',
                        ' 3 - - O - -',
                        ' 2 - O O O O',
                        ' 1 X - O - -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=2 size=3',
                        '-[1, 4]x[0, 4] libs=7 size=10',
                        '+[0, 0]x[0, 0] libs=1 size=0',
                        null,
                        '+[0, 0]x[4, 4] libs=2 size=1',
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        '+[0, 0]x[0, 0] libs=6 size=0',
                        null,
                        null,
                        '+[0, 0]x[0, 0] libs=2 size=0',
                        '+[0, 0]x[0, 0] libs=11 size=0',
                        null,
                        '+[4, 4]x[1, 1] libs=2 size=1',
                        '+[3, 3]x[0, 0] libs=1 size=1',
                    ]);
                }],
            ];

            const xyc = (m: string) => stone(
                m.charCodeAt(1) - 0x41,
                b.size - +m.slice(2),
                m[0] == '+' ? +1 : -1);

            // play and undo all the moves a few times
            for (let j = 0; j < 1e2; j++) {
                const hash = [b.hash];

                $(b.blocks).equal([0]);

                // play all the moves
                for (let i = 0; i < moves.length; i++) {
                    const [m, r, test] = moves[i];
                    const result = b.play(xyc(m));

                    hash.push(b.hash);

                    try {
                        $(result).equal(r);
                        test();
                    } catch (reason) {
                        const error = new Error('Failed to play #' + i + ' = ' + m);
                        error.reason = reason;
                        throw error;
                    }
                }

                // undo all the moves
                for (let i = moves.length - 1; i > 0; i--) {
                    const [, , test] = moves[i - 1];
                    const [move, , ] = moves[i];
                    const h = hash[i];

                    try {
                        if (moves[i][1] > 0) {
                            const m = b.undo();
                            $(stone.toString(xyc(move))).equal(stone.toString(m));
                            $(b.hash).equal(h);
                        }

                        test();
                    } catch (reason) {
                        const error = new Error(`Failed to undo #${i} = #-${moves.length - i}`);
                        error.reason = reason;
                        throw error;
                    }
                }

                b.undo();
                $(b.hash).equal(hash[0]);
                $(b.blocks).equal([0]);
            }
        });

        $.test($ => {
            /// snapback

            const b = new Board(5, [
                ' - O - X O ',
                ' X X O X O ',
                ' - - X O O ',
            ]);

            try {
                b.play(stone(2, 0, +1));
                $(b + '').equal(
                    '   A B C D E' + '\n' +
                    ' 5 - O X X O' + '\n' +
                    ' 4 X X - X O' + '\n' +
                    ' 3 - - X O O');

                b.play(stone(2, 1, -1));
                $(b + '').equal(
                    '   A B C D E' + '\n' +
                    ' 5 - O - - O' + '\n' +
                    ' 4 X X O - O' + '\n' +
                    ' 3 - - X O O');

                b.play(stone(2, 0, +1));
                $(b + '').equal(
                    '   A B C D E' + '\n' +
                    ' 5 - O X - O' + '\n' +
                    ' 4 X X O - O' + '\n' +
                    ' 3 - - X O O');

                b.play(stone(3, 0, -1));
                $(b + '').equal(
                    '   A B C D E' + '\n' +
                    ' 5 - O - O O' + '\n' +
                    ' 4 X X O - O' + '\n' +
                    ' 3 - - X O O');
            } catch (e) {
                console.log(b + '');
                throw e;
            }
        });

        $.test($ => { 
            /// empty 3x3
            const board = new Board(3);

            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
            $(board.toString()).equal('   A\n 3 -');
            $(board.toStringCompact()).equal('3x3()');
        });

        $.test($ => { 
            /// 5x5 with a stone
            const board = new Board(5);
            board.play(stone(2, 2, +1));

            $(board.toString('SGF')).equal('(;FF[4]SZ[5]AB[cc])');
            $(board.toString()).equal('   A B C\n 5 - - -\n 4 - - -\n 3 - - X');
            $(board.toStringCompact()).equal('5x5(;;--X)');
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
                ' 9 - X - -',
                ' 8 X O O -',
                ' 7 X X O -',
                ' 6 - X O -',
                ' 5 - X - O',
                ' 4 - - X O',
                ' 3 - X O -',
                ' 2 - X O O',
                ' 1 O O O -'
            ].join('\n'));

            $(board.toStringCompact()).equal('9x9(-X;XOO;XXO;-XO;-X-O;--XO;-XO;-XOO;OOO)');
        });

        $.test($ => { 
            /// 9x9 from txt to txt
            const board = new Board(9, [
                '-X-------',
                'XOO------',
                'XXO-----X',
                '-XO------',
                '-X-O-----',
                '--XO-----',
                '-XO------',
                '-XOO-----',
                'OOO------'
            ]);

            $(board + '').equal([
                '   A B C D E F G H J',
                ' 9 - X - - - - - - -',
                ' 8 X O O - - - - - -',
                ' 7 X X O - - - - - X',
                ' 6 - X O - - - - - -',
                ' 5 - X - O - - - - -',
                ' 4 - - X O - - - - -',
                ' 3 - X O - - - - - -',
                ' 2 - X O O - - - - -',
                ' 1 O O O - - - - - -'
            ].join('\n'));
        });

        $.test($ => { 
            /// total libs
            const b = new Board(5);

            try {
                $(sumlibs(b, +1)).equal(0);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(0, 0, +1));

                $(sumlibs(b, +1)).equal(2);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(1, 0, +1));

                $(sumlibs(b, +1)).equal(3);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(4, 0, +1));

                $(sumlibs(b, +1)).equal(5);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(3, 0, +1));

                $(sumlibs(b, +1)).equal(5);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(2, 0, +1));

                $(sumlibs(b, +1)).equal(5);
                $(sumlibs(b, -1)).equal(0);

                b.play(stone(0, 1, -1));

                $(sumlibs(b, +1)).equal(4);
                $(sumlibs(b, -1)).equal(2);

                b.play(stone(1, 1, -1));

                $(sumlibs(b, +1)).equal(3);
                $(sumlibs(b, -1)).equal(3);

                b.play(stone(4, 1, -1));

                $(sumlibs(b, +1)).equal(2);
                $(sumlibs(b, -1)).equal(5);

                b.play(stone(3, 1, -1));

                $(sumlibs(b, +1)).equal(1);
                $(sumlibs(b, -1)).equal(5);

                b.play(stone(2, 1, -1));

                $(sumlibs(b, +1)).equal(0);
                $(sumlibs(b, -1)).equal(10);
            } catch (e) {
                console.log(b + '');
                throw e;
            }
        });

        $.test($ => { 
            /// capture
            const b = new Board(9, [
                'X-XXOOOO',
                'XX-XXOOX',
                '--XOO-OX',
                '--XOOOXX',
                '---XXX--']);

            console.log(b + '');

            const n = b.play(stone(5, 2, +1));

            console.log(b + '');

            // board is 9x9 so the rightmost column is empty
            $(n).equal(5 + 1);

            $(b + '').equal(
                '   A B C D E F G H\n' +
                ' 9 X - X X O O O O\n' +
                ' 8 X X - X X O O X\n' +
                ' 7 - - X - - X O X\n' +
                ' 6 - - X - - - X X\n' +
                ' 5 - - - X X X - -');
        });

        $.test($ => {
            /// captured block releases libs

            const b = new Board(9, [
                'O X',
                '- -'
            ]);

            const r = b.play(stone(0, 1, 1));

            $(r).equal(2);

            $(b.toString('RL-')).equal([
                ' 0 3',
                ' 3 0'
            ].join('\n'));
        });

        $.test($ => {
            /// suicide #1

            const b = new Board(9, [
                '- X',
                'X X'
            ]);

            const r = b.play(stone(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #2

            const b = new Board(9, [
                '- O X',
                'X X X'
            ]);

            const r = b.play(stone(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #3

            const b = new Board(9, [
                '- O X',
                'O X X',
                'X X X'
            ]);

            const r = b.play(stone(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #4

            const b = new Board(9, [
                '- O X',
                'O O X',
                'X X X'
            ]);

            const r = b.play(stone(0, 0, -1));

            $(r).equal(0);
        });
    });

    ut.group($ => {
        /// board.hash

        $.test($ => {
            /// basic

            const b1 = new Board(5, [
                ' - O O X ',
                ' X O O X ',
                ' O O O X ',
                ' X X X X ',
            ]);

            const b2 = new Board(5, [
                ' - X O X ',
                ' O O O X ',
                ' O O O X ',
                ' X X X X ',
            ]);

            if (b1.hash == b2.hash)
                throw new Error('Hash collision');
        });
    });
}
