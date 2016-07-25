namespace tests {
    import rand = tsumego.rand;
    import SortedArray = tsumego.SortedArray;

    ut.group($ => {
        /// sorted array

        const charCodes = (s: string) => s.split('').map(c => c.charCodeAt(0));

        function compare(lhs: number[], rhs: number[]) {
            for (let i = 0; i < lhs.length; i++) {
                const d = rhs[i] - lhs[i];
                if (d) return d;
            }

            return 0;
        }

        $.test($ => {
            /// numbers

            const n = 100;

            const sa = new SortedArray<number>();

            const numbers = sa.reset();

            for (let i = 0; i < n; i++) {
                const x = rand() & 0xFFFF;
                sa.insert(x, charCodes(x + ''));

                for (let i = 1; i < numbers.length; i++)
                    if (compare(charCodes(numbers[i - 1] + ''), charCodes(numbers[i] + '')) > 0)
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
