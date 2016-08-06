module tests {
    ut.group($ => {
        /// the external interface

        $.test($ => {
            /// best move exists, black wins

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('B');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// best move exists, white wins

            const p = new tsumego.Solver('(;FF[4]SZ[5]PL[W]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('W');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// no best move exists, black wins

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AW[ab][bb][cb][db][da]\
                AB[ac][bc][cc][dc][ec][eb][ea][ba])');

            const move = p.solve('W');

            $(move).equal('');
        });

        $.test($ => {
            /// no best move exists, white wins

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AW[ab][bb][cb][db][da][ba]\
                AB[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('B');

            $(move).equal('');
        });

        $.test($ => {
            /// black is captured

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('W');

            $(move).equal('W[ba]');
        });

        $.test($ => {
            /// black lives

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AB[ab][bb][cb][db][da]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('B');

            $(move).equal('B[ba]');
        });

        $.test($ => {
            /// black cannot be captured

            const p = new tsumego.Solver('(;FF[4]SZ[5]MA[bb]\
                AB[ab][bb][cb][db][da][ba]\
                AW[ac][bc][cc][dc][ec][eb][ea])');

            const move = p.solve('W');

            $(move).equal('');
        });

        $.test($ => {
            /// invalid format

            const sgf = '(;FF[4]';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('SyntaxError: Invalid SGF.');
        });

        $.test($ => {
            /// missing tags

            const sgf = '(;FF[4])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('SyntaxError: The SGF does not correctly describe a tsumego:'
                + '\n\tSZ[n] tag must specify the size of the board.'
                + '\n\tMA[xy] must specify the target white stone.');
        });

        $.test($ => {
            /// too big board size

            const sgf = '(;FF[4]SZ[19])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('SyntaxError: The SGF does not correctly describe a tsumego:'
                + '\n\tBoard 19x19 is too big. Up to 16x16 boards are supported.'
                + '\n\tMA[xy] must specify the target white stone.');
        });
    });
}
