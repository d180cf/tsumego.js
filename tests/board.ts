/// <reference path="../tsumego.d.ts" />

ut.group($ => {
    $.test($ => {
        const board = new Board(`
           (;FF[4]SZ[8]
            ;AW[bb][cb][cc][cd][de][df][cg][ch][dh][ai][bi][ci]
             AB[ba][ab][ac][bc][bd][be][cf][bg][bh])`);

        $(board + '').equal('');
    });
});
