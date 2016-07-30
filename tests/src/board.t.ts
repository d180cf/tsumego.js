module tests {
    import stone = tsumego.stone;
    import block = tsumego.block;
    import sumlibs = tsumego.mgen.sumlibs;
    import Board = tsumego.Board;

    ut.group($ => {
        /// board

        $.test($ => {
            /// liberties

            const b = new Board(5, [
                '- X - O -',
                'X X O O O',
                'O X - X X',
                '- X X X -',
                'X O O - X',
            ]);

            const r = {
                0x00: [],
                0x11: [0x00, 0x02, 0x30, 0x22, 0x43, 0x34],
                0x40: [0x30],
                0x44: [0x43, 0x34],
                0x12: [0x02, 0x04, 0x22],
                0x41: [0x43]
            };

            for (const t in r) {
                const w = [];
                const q = b.get(+t & 15, +t >> 4);

                for (const [x, y] of b.libs(q))
                    w.push(x | y << 4);

                console.log(t, r[t].sort(), w.sort());

                $(r[t].sort()).equal(w.sort());
            }
        });

        $.test($ => {
            /// stones

            const b = new Board(5, [
                '- X - O -',
                'X X O O O',
                'O X - X X',
                '- X X X -',
                'X O O - X',
            ]);

            const r = {
                0x00: [],
                0x10: [0x10, 0x11, 0x01, 0x12, 0x13, 0x23, 0x33, 0x32, 0x42],
                0x04: [0x04],
                0x44: [0x44],
                0x21: [0x21, 0x30, 0x31, 0x41],
                0x14: [0x14, 0x24]
            };

            for (const t in r) {
                const w = [];
                const q = b.get(+t >> 4, +t & 15);

                for (const s of b.stones(q))
                    w.push(stone.x(s) << 4 | stone.y(s));

                console.log(t, q, r[t], w);

                $(r[t].sort()).equal(w.sort());
            }
        });

        $.test($ => {
            /// neighbors

            const b = new Board(3);
            const a = new CharBoard(3);

            const nbs = {
                // corners
                0x00: [0x01, 0x10],
                0x20: [0x10, 0x21],
                0x22: [0x21, 0x12],
                0x02: [0x01, 0x12],
                // sides
                0x10: [0x00, 0x20, 0x11],
                0x21: [0x20, 0x11, 0x22],
                0x12: [0x11, 0x02, 0x22],
                0x01: [0x00, 0x11, 0x02],
                // center
                0x11: [0x10, 0x21, 0x12, 0x01]
            };

            for (const t in nbs) {
                const f = [];

                for (const [x, y] of b.neighbors(+t & 15, +t >> 4))
                    f.push(x | y << 4);

                $(f.sort()).equal(nbs[t].sort());
            }
        });

        $.test($ => {
            /// blocks
            const b = new Board(5);

            const moves: [string, number, () => void][] = [
                ['+A5', 1, () => {
                    $(b.toString()).equal([
                        '  a',
                        'a X',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=2 size=1'
                    ]);
                }],

                ['-B5', 1, () => {
                    $(b.toString()).equal([
                        '  a b',
                        'a X O',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 1]x[0, 0] libs=2 size=1'
                    ]);
                }],

                ['+B4', 1, () => {
                    $(b.toString()).equal([
                        '  a b',
                        'a X O',
                        'b - X',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 1]x[0, 0] libs=1 size=1',
                        '+[1, 1]x[1, 1] libs=3 size=1'
                    ]);
                }],

                ['-C5', 1, () => {
                    $(b.toString()).equal([
                        '  a b c',
                        'a X O O',
                        'b - X -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 0]x[0, 0] libs=1 size=1',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[1, 1]x[1, 1] libs=3 size=1'
                    ]);
                }],

                ['+A4', 1, () => {
                    $(b.toString()).equal([
                        '  a b c',
                        'a X O O',
                        'b X X -',
                    ].join('\n'));

                    $(b.blocks.map(block.toString)).equal([null,
                        '+[0, 1]x[0, 1] libs=3 size=3',
                        '-[1, 2]x[0, 0] libs=2 size=2',
                        '+[0, 0]x[0, 0] libs=1 size=0'
                    ]);
                }],

                ['-E5', 1, () => {
                    $(b.toString()).equal([
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - - - -',
                        'd - - - - -',
                        'e X - - - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - - - -',
                        'd - - - O -',
                        'e X - - - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - - - -',
                        'd - O - O -',
                        'e X - - - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - O - -',
                        'd - O - O -',
                        'e X - - - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - O - -',
                        'd - O - O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - O - -',
                        'd - O - O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X - - -',
                        'c - - O - -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X O',
                        'b X X - - -',
                        'c - - O - -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X - - X',
                        'c - - O - -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X - O X',
                        'c - - O - -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X - O X',
                        'c - - O X -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X O O X',
                        'c - - O X -',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X O O X',
                        'c - - O X X',
                        'd - O O O -',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X O O X',
                        'c - - O X X',
                        'd - O O O O',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X O O X',
                        'c - - O X X',
                        'd - O O O O',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X O O -',
                        'c - - O - -',
                        'd - O O O O',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O - O',
                        'b X X O O X',
                        'c - - O - -',
                        'd - O O O O',
                        'e X - O - -',
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
                        '  a b c d e',
                        'a X O O X -',
                        'b X X O O X',
                        'c - - O - -',
                        'd - O O O O',
                        'e X - O - -',
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

            const xyc = (m: string) => stone.make(
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
                    const [move, ,] = moves[i];
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
                b.play(stone.make(2, 0, +1));
                $(b + '').equal(
                    '  a b c d e' + '\n' +
                    'a - O X X O' + '\n' +
                    'b X X - X O' + '\n' +
                    'c - - X O O');

                b.play(stone.make(2, 1, -1));
                $(b + '').equal(
                    '  a b c d e' + '\n' +
                    'a - O - - O' + '\n' +
                    'b X X O - O' + '\n' +
                    'c - - X O O');

                b.play(stone.make(2, 0, +1));
                $(b + '').equal(
                    '  a b c d e' + '\n' +
                    'a - O X - O' + '\n' +
                    'b X X O - O' + '\n' +
                    'c - - X O O');

                b.play(stone.make(3, 0, -1));
                $(b + '').equal(
                    '  a b c d e' + '\n' +
                    'a - O - O O' + '\n' +
                    'b X X O - O' + '\n' +
                    'c - - X O O');
            } catch (e) {
                console.log(b + '');
                throw e;
            }
        });

        $.test($ => {
            /// empty 3x3
            const board = new Board(3);

            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
        });

        $.test($ => {
            /// 5x5 with a stone
            const board = new Board(5);
            board.play(stone.make(2, 2, +1));

            $(board.toString('SGF')).equal('(;FF[4]SZ[5]AB[cc])');
        });

        $.test($ => {
            /// empty 3x3 from sgf
            const board = new Board(`(;FF[4]SZ[3])`);
            $(board.toString('SGF')).equal('(;FF[4]SZ[3])');
        });

        $.test($ => {
            /// variation from sgf
            const board = new Board(`(;FF[4]SZ[3]AB[aa][bb]AW[ba](;AB[cc]AW[ab]))`, 1);
            $(board + '').equal(
                '  a b c' + '\n' +
                'a - O -' + '\n' +
                'b O X -' + '\n' +
                'c - - X');
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
                '  a b c d',
                'a - X - -',
                'b X O O -',
                'c X X O -',
                'd - X O -',
                'e - X - O',
                'f - - X O',
                'g - X O -',
                'h - X O O',
                'i O O O -'
            ].join('\n'));
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
                '  a b c d e f g h i',
                'a - X - - - - - - -',
                'b X O O - - - - - -',
                'c X X O - - - - - X',
                'd - X O - - - - - -',
                'e - X - O - - - - -',
                'f - - X O - - - - -',
                'g - X O - - - - - -',
                'h - X O O - - - - -',
                'i O O O - - - - - -'
            ].join('\n'));
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

            const n = b.play(stone.make(5, 2, +1));

            console.log(b + '');

            // board is 9x9 so the rightmost column is empty
            $(n).equal(5 + 1);

            $(b + '').equal(
                '  a b c d e f g h\n' +
                'a X - X X O O O O\n' +
                'b X X - X X O O X\n' +
                'c - - X - - X O X\n' +
                'd - - X - - - X X\n' +
                'e - - - X X X - -');
        });

        $.test($ => {
            /// captured block releases libs

            const b = new Board(9, [
                'O X',
                '- -'
            ]);

            const r = b.play(stone.make(0, 1, 1));

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

            const r = b.play(stone.make(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #2

            const b = new Board(9, [
                '- O X',
                'X X X'
            ]);

            const r = b.play(stone.make(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #3

            const b = new Board(9, [
                '- O X',
                'O X X',
                'X X X'
            ]);

            const r = b.play(stone.make(0, 0, -1));

            $(r).equal(0);
        });

        $.test($ => {
            /// suicide #4

            const b = new Board(9, [
                '- O X',
                'O O X',
                'X X X'
            ]);

            const r = b.play(stone.make(0, 0, -1));

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
