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
            /// missing size

            const sgf = '(;FF[4])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('SyntaxError: SZ[n] tag must specify the size of the board.');
        });

        $.test($ => {
            /// too big board size

            const sgf = '(;FF[4]SZ[19])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('Error: Board 19x19 is too big. Up to 16x16 boards are supported.');
        });

        $.test($ => {
            /// missing target

            const sgf = '(;FF[4]SZ[7])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('SyntaxError: MA[..] must specify the target.');
        });

        $.test($ => {
            /// empty target

            const sgf = '(;FF[4]SZ[7]MA[cb])';
            const error = $.error(() => new tsumego.Solver(sgf));

            $(error + '').equal('Error: The target MA[cb] cannot point to an empty intersection.');
        });
    });
}
