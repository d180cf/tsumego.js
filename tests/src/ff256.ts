namespace tests {
    import ff256 = tsumego.ff256;

    ut.group($ => {
        /// FF(2**8)

        $.test($ => {
            /// inv

            $(ff256.inv(0x23)).equal(0xf1);
            $(ff256.inv(0x46)).equal(0xf5);
            $(ff256.inv(0x17)).equal(0x5f);
            $(ff256.inv(0xf5)).equal(0x46);
        });

        $.test($ => {
            /// inv4

            $(ff256.inv4(0x234617f5)).equal(0xf1f55f46 | 0);
        });

        $.test($ => {
            /// mul

            $(ff256.mul(0xb6, 0x53)).equal(0x36);
            $(ff256.mul(0x46, 0x11)).equal(0x4a);
            $(ff256.mul(0x18, 0x0b)).equal(0xe8);
            $(ff256.mul(0xc5, 0xd3)).equal(0x6c);
        });

        $.test($ => {
            /// mul4

            $(ff256.mul4(0xb64618c5, 0x53110bd3)).equal(0x364ae86c | 0);
        });
    });
}
