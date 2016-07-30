namespace tests {
    import rand = tsumego.rand;
    import SortedArray = tsumego.SortedArray;

    ut.group($ => {
        /// sorted array

        // computes s[0] + s[1] / 256 + s[2] / 256**2 + s[3] / 256**3 + ...
        const value = (s: string): number => s.charCodeAt(0) + (s.length < 1 ? 0 : value(s.slice(1)) / 256);

        $.test($ => {
            /// numbers

            const n = 100;

            const sa = new SortedArray<number>();

            const numbers = sa.reset();

            for (let i = 0; i < n; i++) {
                const x = rand() & 0xFFFF;
                sa.insert(x, [value(x + '')]);

                for (let i = 1; i < numbers.length; i++)
                    if (value(numbers[i - 1] + '') < value(numbers[i] + ''))
                        throw new Error('Incorrectly sorted numbers: ' + numbers);
            }

            $(numbers.length).equal(n);
        });

        $.test($ => {
            /// stable

            const sa = new SortedArray<string>();
            const a = sa.reset();
            const b: string[] = [];

            for (let n = 1; n < 10; n++) {
                let i = 0;

                do {
                    const x = String.fromCharCode(0x41 + i) + n;
                    sa.insert(x, [-i]);
                    b.push(x);
                    i = (i * 27 + 3) % 26;
                } while (i > 0);
            }

            $(a).equal(b.sort());
        });
    });
}
