module test {
    'use strict';

    import Net = tsumego.ann.SimpleLayeredNetwork;

    ut.group($ => {
        /// ann

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
    });
}
