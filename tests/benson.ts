module test {
    import benson = tsumego.benson;
    import Board = tsumego.Board;
    import XY = tsumego.XY;

    ut.group($ => {
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
                const alive: boolean[] = []; // [x | y << 5]

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const marker = (rows[y] || '').charAt(x * 2);
                        const color = { x: +1, o: -1 }[marker.toLowerCase()] || 0;

                        if (color) {
                            board.play(x, y, color);
                            alive[x | y << 5] = marker.toLowerCase() != marker;
                        }
                    }
                }

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        if (!board.chainAt(x, y))
                            continue;

                        const actual = benson.alive(board, { x: x, y: y });
                        const expected = !!alive[x | y << 5];

                        if (actual != expected)
                            throw Error(`x=${x} y=${y} is ${expected ? '' : 'not '}expected to be pass alive`);
                    }
                }
            }, title);
        }

        $.test($ => {
            /// start from a vacant point
            const b = new Board(9, []);
            const p = new XY(0, 0);
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
    });
}