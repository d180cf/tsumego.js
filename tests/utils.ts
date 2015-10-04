namespace tests {
    import SortedArray = tsumego.SortedArray;
    import LCG = tsumego.rand.LCG.NR32;

    ut.group($ => {
        /// sorted array

        $.test($ => {
            /// numbers

            const n = 100;

            const rand = LCG(298894);

            const compare = (a, b) =>
                a[0] - b[0] ||
                a[1] - b[1] ||
                a[2] - b[2];

            const sa = new SortedArray<number, string>(compare);

            const numbers = sa.reset();

            for (let i = 0; i < n; i++) {
                const x = rand() & 0xFFFF;
                sa.insert(x, x + '');

                for (let i = 1; i < numbers.length; i++)
                    if (compare(numbers[i - 1] + '', numbers[i] + '') > 0)
                        throw new Error('Incorrectly sorted numbers: ' + numbers);
            }

            $(numbers.length).equal(n);
        });
    });
}
