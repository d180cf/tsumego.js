module test {
    import benson = tsumego.benson;
    import Board = tsumego.Board;
    import XY = tsumego.XY;

    ut.group($ => {
        $.test($ => {
            /// start from a vacant point
            const b = new Board(9, []);
            const r = benson.alive(b, [new XY(0, 0)]);
            $(r).equal(false);
        });

        $.test($ => {
            /// single stone is not alive
            const b = new Board(9, ['X']);
            const r = benson.alive(b, [new XY(0, 0)]);
            $(r).equal(false);
        });

        $.test($ => {
            /// a one-eye group is not alive
            const b = new Board(9, ['-X', 'XX']);
            const r = benson.alive(b, [new XY(1, 1)]);
            $(r).equal(false);
        });        

        $.test($ => {
            /// one vital region is not enough
            const b = new Board(9, [
                '--X',
                '--X',
                'XXX'
            ]);
            const r = benson.alive(b, [new XY(2, 2)]);
            $(r).equal(false);
        });

        $.test($ => {
            /// a two-eye group is alive
            const b = new Board(9, ['-X-X', 'XXXX']);
            const r = benson.alive(b, [new XY(1, 1)]);
            $(r).equal(true);
        });

        $.test($ => {
            /// two vital regions is enough
            const b = new Board(9, [
                '--X--X',
                '--X--X',
                'XXXXXX'
            ]);
            const r = benson.alive(b, [new XY(2, 2)]);
            $(r).equal(true);
        });

        $.test($ => {
            /// the smallest alive group
            const b = new Board(9, [
                'X-X',
                '-XX',
                'XXX'
            ]);
            const r = benson.alive(b, [new XY(2, 2)]);
            $(r).equal(true);
        });

        $.test($ => {
            /// not pass-alive due to a ko
            const b = new Board(9, [
                'X--X',
                '-XXX',
                'XXXX'
            ]);
            const r = benson.alive(b, [new XY(2, 2)]);
            $(r).equal(false);
        });
    });
}