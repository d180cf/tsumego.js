module tests {
    import Board = tsumego.Board;
    import stone = tsumego.stone;
    import block = tsumego.block;
    import eyeness = tsumego.eyeness;
    import region = tsumego.region;

    function parse(size: number, rows: string[]): [Board, stone[]] {
        const board = new Board(size, rows.map(s => s.toUpperCase()));

        const safe_s: stone[] = [];
        const safe_b: block[] = [];

        for (let y = 0; y < rows.length; y++) {
            const r = rows[y].replace(/\s/g, '');

            for (let x = 0; x < r.length; x++) {
                const b = board.get(x, y);

                if (b && safe_b.indexOf(b) < 0 && r[x] == r[x].toUpperCase()) {
                    const s = stone.make(x, y, 0);

                    safe_s.push(s);
                    safe_b.push(b);
                }
            }
        }

        console.log('safe:', safe_s.map(stone.toString).join(''));
        console.log(board + '');

        return [board, safe_s];
    }

    ut.group($ => {
        /// eyeness

        $.test($ => {
            /// empty board

            const b = new Board(5);
            const e = eyeness(b, b.range(), []);

            $(e(+1)).equal(25);
            $(e(-1)).equal(25);
        });

        $.test($ => {
            /// a few unsafe stones

            const [b, s] = parse(5, [
                ' - - x - - ',
                ' o x - o - ',
                ' - - - - o ',
                ' x x - - o ',
                ' o - x o - ',
            ]);

            const e = eyeness(b, b.range(), s);

            $(e(+1)).equal(11);
            $(e(-1)).equal(12);
        });

        $.test($ => {
            /// false eyes on the edge

            const [b, s] = parse(5, [
                ' - x - - - ',
                ' x O x x x ',
                ' - O O O - ',
                ' - x O x - ',
                ' - - - - - ',
            ]);

            const e = eyeness(b, b.range(), s);

            $(e(+1)).equal(4);
            $(e(-1)).equal(10);
        });

        $.test($ => {
            /// a false eye v1

            const [b, s] = parse(5, [
                ' - - - - - ',
                ' - x x O - ',
                ' - x - x - ',
                ' - O x x - ',
                ' - - - - - ',
            ]);

            const e = eyeness(b, b.range(), s);

            $(e(+1)).equal(6);
            $(e(-1)).equal(14);
        });

        $.test($ => {
            /// a false eye v2

            const [b, s] = parse(5, [
                ' - - - - - ',
                ' - x x x - ',
                ' - x - x - ',
                ' O O x O O ',
                ' - - x - - ',
            ]);

            const e = eyeness(b, b.range(), s);

            $(e(+1)).equal(7);
            $(e(-1)).equal(11);
        });

        $.test($ => {
            /// board changed

            const [b, s] = parse(5, [
                ' - o o - - ',
                ' X X X X X ',
                ' - - - - X ',
                ' - x o o X ',
                ' o o x - X ',
            ]);

            const e = eyeness(b, b.range(), s);

            $(e(+1)).equal(9);
            $(e(-1)).equal(2);

            b.play(stone.make(0, 3, +1));
            console.log('changed:\n' + b);

            $(e(+1)).equal(9);
            $(e(-1)).equal(3);
        });
    });
}
