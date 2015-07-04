/// <reference path="../tsumego.d.ts" />

ut.group($ => {
    $.test($ => {
        const root = SGF.parse('()');
        $(root).equal({ tags: [], vars: [] });
    });

    $.test($ => {
        const root = SGF.parse('(;)');
        $(root).equal({ tags: [[]], vars: [] });
    });

    $.test($ => {
        const root = SGF.parse('(;;)');
        $(root).equal({ tags: [[], []], vars: [] });
    });

    $.test($ => {
        const root = SGF.parse('(())');
        $(root).equal({
            tags: [],
            vars: [{ tags: [], vars: [] }]
        });
    });

    $.test($ => {
        const root = SGF.parse('(()())');
        $(root).equal({
            tags: [],
            vars: [
                { tags: [], vars: [] },
                { tags: [], vars: [] }]
        });
    });

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
             (;B[ae];W[ag]))
        `);

        $(root).equal({
            tags: [
                [
                    { name: "FF", vals: ["4"] },
                    { name: "GM", vals: ["1"] },
                    { name: "SZ", vals: ["19"] },
                    { name: "GN", vals: ["Copyright goproblems.com"] },
                    { name: "PB", vals: ["Black"] },
                    { name: "HA", vals: ["0"] },
                    { name: "PW", vals: ["White"] },
                    { name: "KM", vals: ["5.5"] },
                    { name: "DT", vals: ["1999-07-21"] },
                    { name: "TM", vals: ["1800"] },
                    { name: "RU", vals: ["Japanese"] }
                ],
                [
                    { name: "AW", vals: ["bb", "cb", "cc", "cd", "de", "df", "cg", "ch", "dh", "ai", "bi", "ci"] },
                    { name: "AB", vals: ["ba", "ab", "ac", "bc", "bd", "be", "cf", "bg", "bh"] },
                    { name: "C", vals: ["Black to play and live."] }
                ]
            ],
            vars: [
                {
                    tags: [
                        [{ name: "B", vals: ["af"] }],
                        [{ name: "W", vals: ["ah"] }]
                    ],
                    vars: [
                        {
                            tags: [
                                [{ name: "B", vals: ["ce"] }],
                                [
                                    { name: "W", vals: ["ag"] },
                                    { name: "C", vals: ["only one eye this way"] }
                                ]
                            ],
                            vars: []
                        },
                        {
                            tags: [
                                [{ name: "B", vals: ["ag"] }],
                                [{ name: "W", vals: ["ce"] }]
                            ],
                            vars: []
                        }
                    ]
                },
                {
                    tags: [
                        [{ name: "B", vals: ["ah"] }],
                        [{ name: "W", vals: ["af"] }]
                    ],
                    vars: [
                        {
                            tags: [
                                [{ name: "B", vals: ["ae"] }],
                                [{ name: "W", vals: ["bf"] }],
                                [{ name: "B", vals: ["ag"] }],
                                [{ name: "W", vals: ["bf"] }]
                            ],
                            vars: [
                                {
                                    tags: [
                                        [{ name: "B", vals: ["af"] }],
                                        [
                                            { name: "W", vals: ["ce"] },
                                            { name: "C", vals: ["oops! you can't take this stone"] }
                                        ]
                                    ],
                                    vars: []
                                },
                                {
                                    tags: [
                                        [{ name: "B", vals: ["ce"] }],
                                        [{ name: "W", vals: ["af"] }],
                                        [
                                            { name: "B", vals: ["bg"] },
                                            { name: "C", vals: ["RIGHT black plays under the stones and lives"] }
                                        ]
                                    ],
                                    vars: []
                                }
                            ]
                        },
                        {
                            tags: [
                                [{ name: "B", vals: ["bf"] }],
                                [{ name: "W", vals: ["ae"] }]
                            ],
                            vars: []
                        }
                    ]
                },
                {
                    tags: [
                        [{ name: "B", vals: ["ae"] }],
                        [{ name: "W", vals: ["ag"] }]
                    ],
                    vars: []
                }
            ]
        });
    });
});
