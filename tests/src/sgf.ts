﻿namespace tests {
    ut.group($ => { 
        /// sgf
        $.test($ => { 
            /// empty
            const root = SGF.parse('()');
            $(root).equal({ steps: [], vars: [] });
        });

        $.test($ => { 
            /// two empty steps
            const root = SGF.parse('(;)');
            $(root).equal({ steps: [{}], vars: [] });
        });

        $.test($ => { 
            /// three empty steps
            const root = SGF.parse('(;;)');
            $(root).equal({ steps: [{}, {}], vars: [] });
        });

        $.test($ => { 
            /// nested empty var
            const root = SGF.parse('(())');
            $(root).equal({
                steps: [],
                vars: [{ steps: [], vars: [] }]
            });
        });

        $.test($ => { 
            /// two nested empty vars
            const root = SGF.parse('(()())');
            $(root).equal({
                steps: [],
                vars: [
                    { steps: [], vars: [] },
                    { steps: [], vars: [] }]
            });
        });

        $.test($ => { 
            /// empty with FF
            const root = SGF.parse('(;FF\n[4]\n)');
            $(root).equal({
                steps: [{ FF: ['4'] }],
                vars: []
            });
        });

        $.test($ => { 
            /// dup tags
            const root = SGF.parse('(;X[1]Y[2]X[3]Y[4])');
            $(root).equal({
                steps: [{ X: ['1', '3'], Y: ['2', '4'] }],
                vars: []
            });
        });

        $.test($ => { 
            /// real-world example
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
                "steps": [
                    {
                        "FF": ["4"],
                        "GM": ["1"],
                        "SZ": ["19"],
                        "GN": ["Copyright goproblems.com"],
                        "PB": ["Black"],
                        "HA": ["0"],
                        "PW": ["White"],
                        "KM": ["5.5"],
                        "DT": ["1999-07-21"],
                        "TM": ["1800"],
                        "RU": ["Japanese"]
                    },
                    {
                        "AW": ["bb", "cb", "cc", "cd", "de", "df", "cg", "ch", "dh", "ai", "bi", "ci"],
                        "AB": ["ba", "ab", "ac", "bc", "bd", "be", "cf", "bg", "bh"],
                        "C": ["Black to play and live."]
                    }
                ],
                "vars": [
                    {
                        "steps": [
                            { "B": ["af"] },
                            { "W": ["ah"] }
                        ],
                        "vars": [
                            {
                                "steps": [
                                    { "B": ["ce"] },
                                    { "W": ["ag"], "C": ["only one eye this way"] }
                                ],
                                "vars": []
                            },
                            {
                                "steps": [
                                    { "B": ["ag"] },
                                    { "W": ["ce"] }
                                ],
                                "vars": []
                            }
                        ]
                    },
                    {
                        "steps": [
                            { "B": ["ah"] },
                            { "W": ["af"] }
                        ],
                        "vars": [
                            {
                                "steps": [
                                    { "B": ["ae"] },
                                    { "W": ["bf"] },
                                    { "B": ["ag"] },
                                    { "W": ["bf"] }
                                ],
                                "vars": [
                                    {
                                        "steps": [
                                            { "B": ["af"] },
                                            { "W": ["ce"], "C": ["oops! you can't take this stone"] }
                                        ],
                                        "vars": []
                                    },
                                    {
                                        "steps": [
                                            { "B": ["ce"] },
                                            { "W": ["af"] },
                                            { "B": ["bg"], "C": ["RIGHT black plays under the stones and lives"] }
                                        ],
                                        "vars": []
                                    }
                                ]
                            },
                            {
                                "steps": [
                                    { "B": ["bf"] },
                                    { "W": ["ae"] }
                                ],
                                "vars": []
                            }
                        ]
                    },
                    {
                        "steps": [{ "B": ["ae"] }, { "W": ["ag"] }],
                        "vars": []
                    }
                ]
            });
        });
    });
}