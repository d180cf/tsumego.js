module tests {
    'use strict';

    import Board = tsumego.Board;
    import Pattern = tsumego.Pattern;
    import stone = tsumego.stone;
    import rand = tsumego.rand;

    function apply(board: Board, fn: (b: Board, x: number, y: number, c: number) => boolean) {
        const eyes = {};

        for (let x = 0; x < board.size; x++) {
            for (let y = 0; y < board.size; y++) {
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
        /// dumb moves

        $.test($ => {
            /// sure eyes

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

            const eyes = apply(board, tsumego.isDumb);

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

        $.test($ => {
            /// attachments

            const b = new Board(`
                (;FF[4]SZ[9]
                  AB[hb][ib][fc][gc][hc][cd][dd][ed][fd][ae][be][ce]
                  AW[ga][db][eb][fb][ac][bc][cc][id][ge][he][ie][ef][ff][gf][ag][bg][cg][eg][hg][dh][fh][hh]
                  MA[aa])
            `);

            const safe = s => b.get(s) == b.get(stone.make(3, 3, 0));

            console.log(b + '');

            /* for debugging */ {
                const tt = stone.fromString('W[hd]');
                const ss = Pattern.take(b, stone.x(tt), stone.y(tt), stone.color(tt), safe);

                const pp = new Pattern([
                    ' O O O ',
                    ' O - - ',
                    ' ? x x '
                ]);

                console.log(pp.test(ss));
            }

            const dumb = {};

            for (let y = 0; y < b.size; y++)
                for (let x = 0; x < b.size; x++)
                    for (const c of [+1, -1])
                        if (tsumego.isDumb(b, x, y, c, safe))
                            dumb[stone.toString(stone.make(x, y, c))] = 1;

            $(dumb).equal({
                'W[ec]': 1,
                'W[ad]': 1,
                'W[bd]': 1,
                'W[gd]': 1,
                'W[hd]': 1,
                'W[af]': 1,
                'W[bf]': 1,
                'W[fe]': 1,
            });
        });
    });
}