/// <reference path="../tsumego.d.ts" />

ut.group($ => {
    $.test($ => {
        const root = SGF.parse(`
            (;FF[4]GM[1]SZ[19]
             GN[Copyright goproblems.com]
             PB[Black]
             HA[0]
             PW[White]
             KM[5.5]
             DT[1999-07-21]
             TM[1800]
             RU[Japanese]
             ;AW[bb][cb][cc][cd][de][df][cg][ch][dh][ai][bi][ci]
             AB[ba][ab][ac][bc][bd][be][cf][bg][bh]
             C[Black to play and live.]
             (;B[af];W[ah]
             (;B[ce];W[ag]C[only one eye this way])
             (;B[ag];W[ce]))
             (;B[ah];W[af]
             (;B[ae];W[bf];B[ag];W[bf]
             (;B[af];W[ce]C[oops! you can't take this stone])
             (;B[ce];W[af];B[bg]C[RIGHT black plays under the stones and lives]))
             (;B[bf];W[ae]))
             (;B[ae];W[ag]))`);

        $(root).equal(null);
    });
});
