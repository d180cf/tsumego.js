module tests {
    'use strict';

    import Board = tsumego.Board;
    import Pattern = tsumego.Pattern;
    import stone = tsumego.stone;
    import rand = tsumego.rand;

    function apply(board: Board, fn: (b: Board, x: number, y: number, c: number) => boolean) {
        const eyes = {};

        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                // I is skipped
                const xy = String.fromCharCode(x > 7 ? x + 0x42 : x + 0x41) + (16 - y);

                if (fn(board, x, y, +1)) {
                    if (eyes[xy])
                        throw Error(xy + ' already taken');
                    eyes[xy] = +1;
                }

                if (fn(board, x, y, -1)) {
                    if (eyes[xy])
                        throw Error(xy + ' already taken');
                    eyes[xy] = -1;
                }
            }
        }

        return eyes;
    }

    ut.group($ => { 
        /// uc eyes

        $.test($ => { 
            /// 16x16
            const board = new Board(`
            (;FF[4]SZ[16]
                AB
                [ad][ac][ab][bm][bd][bb][ba][cm][ce][cd][cc][do]
                [dn][dm][de][dc][ee][ed][ec][hk][hj][hi][hf][he]
                [hd][hc][ik][ii][ig][ie][ic][jk][jj][ji][jg][jf]
                [je][jd][mb][ma][no][nb][op][oo][oi][oh][po][pi]

                AW
                [ao][bp][bo][bn][co][fm][fl][gn][gl][gk][hm][im]
                [il][md][nf][ne][nd][og][of][od][oc][ob][oa][pg]
                [pe][pc][pb])
            `);

            console.log(board + '');

            const eyes = apply(board, Pattern.isEye);

            $(eyes).equal({
                A16: +1,
                B14: +1,
                D13: +1,
                J13: +1,
                J11: +1,
                J7: +1,
                Q1: +1,
                Q16: -1,
                A1: -1
            });
        });
    });
}