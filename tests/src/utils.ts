namespace tests {
    import rand = tsumego.rand;
    import SortedArray = tsumego.SortedArray;

    ut.group($ => {
        /// sorted array

        $.test($ => {
            /// numbers

            const n = 100;

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

        $.test($ => {
            /// stable

            const sa = new SortedArray<string, number>((a, b) => a - b);
            const a = sa.reset();
            const b: string[] = [];

            for (let n = 1; n < 10; n++) {
                let i = 0;

                do {
                    const x = String.fromCharCode(0x41 + i) + n;
                    sa.insert(x, i);
                    b.push(x);
                    i = (i * 27 + 3) % 26;
                } while (i > 0);
            }

            $(a).equal(b.sort());                        
        });
    });
}
