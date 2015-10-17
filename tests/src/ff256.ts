namespace tests {
    import ff256 = tsumego.ff256;

    ut.group($ => {
        /// FF(2**8)

        $.test($ => {
            /// inv4

            const a = 0x234617f5 | 0;
            const b = 0xf1f55f46 | 0;

            $(ff256.inv4(a)).equal(b);
            $(ff256.inv4(b)).equal(a);

            $(ff256.mul4(a, b)).equal(0x01010101);
        });

        $.test($ => {
            /// mul4 + div4

            const a = 0xb64618c5 | 0;
            const b = 0x53110bd3 | 0;
            const c = 0x364ae86c | 0;

            $(ff256.mul4(a, b)).equal(c);
            $(ff256.mul4(b, a)).equal(c);

            $(ff256.div4(c, a)).equal(b);
            $(ff256.div4(c, b)).equal(a);
        });
    });
}
