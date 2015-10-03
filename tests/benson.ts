module test {
    import benson = tsumego.benson;
    import Board = tsumego.Board;
    import XY = tsumego.XY;

    ut.group($ => {
        /// benson's pass-alive test

        /** invokes the benson's test for every intersection
            on the board and checks whether the result is correct */
        function test(title: string, setup: string) {
            $.test($ => {
                const rows = setup
                    .split(/\r?\n/)
                    .slice(+1, -1)
                    .map(s => s.trim());

                const size = rows
                    .map(s => (s.length + 1) / 2 | 0)
                    .reduce((a, b) => a > b ? a : b, rows.length);

                const board = new Board(size);

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const marker = (rows[y] || '').charAt(x * 2);
                        const color = { x: +1, o: -1 }[marker.toLowerCase()] || 0;

                        if (color)
                            board.play(XY(x, y, color));
                    }
                }

                const rsts: string[] = [];

                for (let y = 0; y < size; y++) {
                    const tags: string[] = [];

                    for (let x = 0; x < size; x++) {
                        const chain = board.get(x, y);
                        const marker = chain > 0 ? 'X' : 'O';

                        tags.push(!chain ? '-' :
                            benson.alive(board, XY(x, y)) ? marker :
                                marker.toLowerCase());
                    }

                    rsts.push(tags.join(' '));
                }

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const lhs = (rows[y] || '').charAt(x * 2) || '-';
                        const rhs = (rsts[y] || '').charAt(x * 2) || '-';

                        if (lhs != rhs) {
                            throw Error(`Expected "${lhs}" at x=${x} y=${y}:\n` + rsts.join('\n'));
                        }
                    }
                }
            }, title);
        }

        $.test($ => {
            /// start from a vacant point
            const b = new Board(9, []);
            const p = XY(0, 0);
            const r = benson.alive(b, p);
            $(r).equal(false);
        });

        test(`single stone is not alive`, `
            x - -
            - x -
            - - x
        `);

        test(`a one-eye group is not alive`, `
            - x -
            x x -
            - - -
        `);

        test(`one vital region is not enough`, `
            - - x -
            - - x -
            x x x -
            - - - -
        `);

        test(`a two-eye group is alive`, `
            - X - X -
            X X X X -
            - - - - -
        `);

        test(`one region is not enough`, `
            - - x -
            x x x -
            - - - -
        `);

        test(`two vital regions is enough`, `
            - - X - - X
            X - X - - X
            X X X X X X
        `);

        test(`two non-vital regions is not enough`, `
            - - x - - x
            - - x - - x
            x x x x x x
        `);

        test(`not an eye #1 on the side`, `
            - x - x - -
            x x x - - -
        `);

        test(`not an eye #1.1 on the side`, `
            - x - x - x -
            x x x - x x -
        `);

        test(`not an eye #1.2 on the side`, `
            - X - X - X - X
            X X X - X X X X
        `);

        test(`not an eye #2 on the side`, `
            - x - - x -
            x x x x - -
        `);

        test(`not an eye #3 on the side`, `
            - x - - - x -
            x x x x x - -
        `);

        test(`the smallest alive group`, `
            X - X
            - X X
            X X X
        `);

        test(`not pass-alive due to a ko`, `
            x - - x -
            - x x x -
            x x x x -
            - - - - -
        `);

        test(`alive with two false eyes in the corner`, `
            X - X X X X X X X
            - X O O O O O O X
            X O - - O - - O X
            X O - - O - - O X
            X O - - O - - O X
            X O O O O O O O X
            X X X X X X X X X
        `);

        test(`alive with two false eyes on the side`, `
            X X - X X X - X X
            X X X O O O X X X
            X O O O - O O O X
            X O - - O - - O X
            X O - - O - - O X
            X O O O O O O O X
            X X X X X X X X X
        `);

        test(`a false eye`, `
            - x x x x x x x x
            x o o o o o o o x
            x o x x x o o o x
            x o x - x o o - x
            x o x x x o o o x
            x o o o o o o o x
            x x x x x x x x x
        `);

        test(`oiotoshi on the side`, `
            - x x - x x - x x
            x x - x x - x x -
            - - - - - - - - -
        `);

        test(`a loop of alive chains`, `
            - X X - X X - X X
            X X - X X - X X -
            X - - - - - - - X
            X - - - - - - X X
            - X - - - - - X -
            X X - - - - - - X
            X - - - - - - X X
            - X X - X X - X -
            X - X X - X X - X
        `);

        test(`a sequence of not pass-alive chains`, `
            - x - -
            x x x -
            - - x -
            - x - x
            - x - x
            - x x x
            - x - x
            - x x x
        `);

        test(`not pass-alive chain attached to an alive chain`, `
            - X - X
            X X X X
            - - X -
            - X - X
            - X - X
            - X X X
            - X - X
            - X X X
        `);

        test(`a sequence of pass-alive chains`, `
            - X - -
            X X X -
            - - X -
            - X - X
            - X X X
            - X - X
            - X X X
        `);
    });
}
