module test {
    import benson = tsumego.benson;
    import Board = tsumego.Board;
    import XY = tsumego.XY;

    ut.group($ => {
        $.test($ => {
            /// start from a vacant point
            const b = new Board(9, []);
            const p = new XY(0, 0);
            const r = benson.alive(b, [p]);
            $(r).equal(false);
        });

        $.test($ => {
            /// single stone is not alive
            const b = new Board(9, ['X']);
            const p = new XY(0, 0);
            const r = benson.alive(b, [p]);
            $(r).equal(false);
        });

        $.test($ => {
            /// a one-eye group is not alive
            const b = new Board(9, ['-X', 'XX']);
            const p = new XY(1, 1);
            const r = benson.alive(b, [p]);
            $(r).equal(false);
        });        

        $.test($ => {
            /// one vital region is not enough
            const b = new Board(9, [
                '--X',
                '--X',
                'XXX'
            ]);
            const p = new XY(2, 2);
            const r = benson.alive(b, [p]);
            $(r).equal(false);
        });

        $.test($ => {
            /// a two-eye group is alive
            const b = new Board(9, ['-X-X', 'XXXX']);
            const p = new XY(1, 1);
            const r = benson.alive(b, [p]);
            $(r).equal(true);
        });

        $.test($ => {
            /// two vital regions is enough
            const b = new Board(9, [
                '--X--X',
                '--X--X',
                'XXXXXX'
            ]);
            const p = new XY(2, 2);
            const r = benson.alive(b, [p]);
            $(r).equal(true);
        });

        $.test($ => {
            /// the smallest alive group
            const b = new Board(9, [
                'X-X',
                '-XX',
                'XXX'
            ]);
            const p = new XY(2, 2);
            const r = benson.alive(b, [p]);
            $(r).equal(true);
        });

        $.test($ => {
            /// not pass-alive due to a ko
            const b = new Board(9, [
                'X--X',
                '-XXX',
                'XXXX'
            ]);
            const p = new XY(2, 2);
            const r = benson.alive(b, [p]);
            $(r).equal(false);
        });

        $.test($ => {
            /// alive with two false eyes in the corner
            const b = new Board(9, [
                'X-XXXXXXX',
                '-XOOOOOOX',
                'XO--O--OX',
                'XO--O--OX',
                'XO--O--OX',
                'XOOOOOOOX',
                'XXXXXXXXX'
            ]);
            const p = new XY(2, 0);
            const r = benson.alive(b, [p]);
            $(r).equal(true);
        });

        $.test($ => {
            /// alive with two false eyes on the side
            const b = new Board(9, [
                'XX-XXX-XX',
                'XXXOOOXXX',
                'XOOO-OOOX',
                'XO--O--OX',
                'XO--O--OX',
                'XOOOOOOOX',
                'XXXXXXXXX'
            ]);
            const p = new XY(0, 0);
            const r = benson.alive(b, [p]);
            $(r).equal(true);
        });
    });
}