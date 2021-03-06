namespace tests {
    'use strict';

    import random = tsumego.random;
    import Net = tsumego.DCNN;

    ut.group($ => {
        /// dcnn

        $.test($ => {
            /// simple 2:2:1 net #1

            const net = new Net(2);

            net.add([
                [0.1, 0.8],
                [0.4, 0.6]
            ]);

            net.add([
                [0.3, 0.9]
            ]);

            const input = [0.35, 0.9];

            const output1 = net.apply(input);
            $(output1).equal([0.6902834929076443]);

            net.adjust([0.5]);

            const output2 = net.apply(input);
            $(output2).equal([0.6820185832642942]);
        });

        $.test($ => {
            /// simple 2:2:1 net #2

            const net = new Net(2);

            net.add([
                [0.1, 0.5],
                [0.3, 0.2]
            ]);

            net.add([
                [0.2, 0.1]
            ]);

            const input = [0.1, 0.7];

            const output1 = net.apply(input);
            $(output1).equal([0.5429061854494511]);

            net.adjust([1.0]);

            const output2 = net.apply(input);
            $(output2).equal([0.5609479467866498]);
        });

        $.test($ => {
            /// simple letters

            const letters = {
                A: [0, 0, 1, 0, 0,
                    0, 1, 0, 1, 0,
                    1, 0, 0, 0, 1,
                    1, 1, 1, 1, 1,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1],

                B: [1, 1, 1, 1, 0,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 1, 1, 1, 0,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 1, 1, 1, 0],

                C: [1, 1, 1, 1, 1,
                    1, 0, 0, 0, 0,
                    1, 0, 0, 0, 0,
                    1, 0, 0, 0, 0,
                    1, 0, 0, 0, 0,
                    1, 0, 0, 0, 0,
                    1, 1, 1, 1, 1],

                D: [1, 1, 1, 1, 0,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 0, 0, 0, 1,
                    1, 1, 1, 1, 0]
            };

            const net = new Net(letters.A.length);

            net.add(letters.A.length, random);
            net.add(letters.A.length, random);
            net.add(4, random);

            for (let i = 0; i < 1e3; i++) {
                net.apply(letters.A);
                net.adjust([1, 0, 0, 0]);

                net.apply(letters.B);
                net.adjust([0, 1, 0, 0]);

                net.apply(letters.C);
                net.adjust([0, 0, 1, 0]);

                net.apply(letters.D);
                net.adjust([0, 0, 0, 1]);
            }

            const a = net.apply(letters.A).map(x => x * 100 | 0);
            const b = net.apply(letters.B).map(x => x * 100 | 0);
            const c = net.apply(letters.C).map(x => x * 100 | 0);
            const d = net.apply(letters.D).map(x => x * 100 | 0);

            console.log(a);
            console.log(b);
            console.log(c);
            console.log(d);

            $(a).matches([$.ge(90), $.le(10), $.le(10), $.le(10)]);
            $(b).matches([$.le(10), $.ge(90), $.le(10), $.le(10)]);
            $(c).matches([$.le(10), $.le(10), $.ge(90), $.le(10)]);
            $(d).matches([$.le(10), $.le(10), $.le(10), $.ge(90)]);
        });
    });
}
