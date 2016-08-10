module tests {
    import stone = tsumego.stone;
    import TT = tsumego.TT;

    ut.group($ => {
        /// TT

        $.test($ => {
            /// a missing entry

            const tt = new TT;

            const r = tt.get(123, 456, +1, -1);

            $(r).equal(0);
        });

        $.test($ => {
            /// getting a result for the same km

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mb, 0); // B plays first and wins when km = 0
            tt.set(123, 456, -1, mw, 0); // W plays first and wins when km = 0

            const rb = tt.get(123, 456, +1, 0); // B plays first when km = 0
            const rw = tt.get(123, 456, -1, 0); // W plays first when km = 0

            $(rb).equal(mb);
            $(rw).equal(mw);
        });

        $.test($ => {
            /// getting a result for another km

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mb, 0); // B plays first and wins when km = 0
            tt.set(123, 456, -1, mw, 0); // W plays first and wins when km = 0

            const rbb = tt.get(123, 456, +1, +1); // B plays first when km = B
            const rbw = tt.get(123, 456, +1, -1); // B plays first when km = W

            const rwb = tt.get(123, 456, -1, +1); // W plays first when km = B
            const rww = tt.get(123, 456, -1, -1); // W plays first when km = W

            $(rbb).equal(mb);
            $(rbw).equal(0);
            $(rwb).equal(0);
            $(rww).equal(mw);
        });

        $.test($ => {
            /// km = null doesn't override km = X

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mw, 0); // B starts and loses if km = 0
            tt.set(123, 456, -1, mb, 0); // W starts and loses if km = 0

            tt.set(123, 456, +1, mb, null); // B starts and wins, but the result depends on a repetition
            tt.set(123, 456, -1, mw, null); // B starts and wins, but the result depends on a repetition

            const rb = tt.get(123, 456, +1, 0); // B starts when km = 0
            const rw = tt.get(123, 456, -1, 0); // W starts when km = 0

            $(rb).equal(stone.nocoords(-1));
            $(rw).equal(stone.nocoords(+1));
        });

        $.test($ => {
            /// trying to upgrade km = null for a winning position

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mb, null); // B starts and wins, but the result depends on a repetition
            tt.set(123, 456, -1, mw, null); // W starts and wins, but the result depends on a repetition

            const rb = tt.get(123, 456, +1, +1); // B starts when km = B
            const rw = tt.get(123, 456, -1, -1); // W starts when km = W

            $(rb).equal(0);
            $(rw).equal(0);
        });

        $.test($ => {
            /// trying to upgrade km = null for a losing position

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mw, null); // B starts and loses, but the result depends on a repetition
            tt.set(123, 456, -1, mb, null); // W starts and loses, but the result depends on a repetition

            const rb = tt.get(123, 456, +1, 0); // B starts when km = 0
            const rw = tt.get(123, 456, -1, 0); // W starts when km = 0

            $(rb).equal(0);
            $(rw).equal(0);
        });

        $.test($ => {
            /// getting a result ignoring km in a winning position

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mb, -1); // B starts and wins even if km = W
            tt.set(123, 456, -1, mw, +1); // W starts and wins even if km = B

            const rb = tt.get(123, 456, +1, null); // B starts and...
            const rw = tt.get(123, 456, -1, null); // W starts and...

            $(rb).equal(mb);
            $(rw).equal(mw);
        });

        $.test($ => {
            /// getting a result ignoring km in a losing position

            const tt = new TT;

            const mb = stone.make(2, 3, +1); // B wins
            const mw = stone.make(3, 4, -1); // W wins

            tt.set(123, 456, +1, mw, 0); // B starts and loses
            tt.set(123, 456, -1, mb, 0); // W starts and loses

            const rb = tt.get(123, 456, +1, null); // B starts and...
            const rw = tt.get(123, 456, -1, null); // W starts and...

            $(rb).equal(stone.nocoords(-1));
            $(rw).equal(stone.nocoords(+1));
        });
    });
}
