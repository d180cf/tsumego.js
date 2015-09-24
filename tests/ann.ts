module test {
    'use strict';

    import Net = tsumego.ann.SimpleLayeredNetwork;

    ut.group($ => {
        /// ann

        $.test($ => {
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
            $(output1).equal([0.69]);

            net.adjust([0.5]);

            const output2 = net.apply(input);
            $(output2).equal([0.68205]);
        });
    });
}