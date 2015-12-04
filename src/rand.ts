module tsumego {
    // en.wikipedia.org/wiki/Mersenne_Twister
    // oeis.org/A221557
    var s: number, m: number[];

    /** Returns a random 32 bit number. MT 19937. */
    export function rand() {
        if (s >= 624) {
            for (let i = 0; i < 624; i++) {
                let y = m[i] & 0x80000000 | m[(i + 1) % 624] & 0x7fffffff;
                m[i] = m[(i + 397) % 624] ^ y >> 1;
                if (y & 1) m[i] = m[i] ^ 0x9908b0df;
            }

            s = 0;
        }

        let y = m[s++];

        y ^= y >>> 11
        y ^= y << 7 & 2636928640
        y ^= y << 15 & 4022730752
        y ^= y >>> 18

        return y;
    }

    export namespace rand {
        /**
         * By default it's initialized to Date.now(), but
         * can be changed to something else before using
         * the solver.         
         */
        export function seed(value: number) {
            s = 624;
            m = [value];

            for (let i = 1; i < 624; i++)
                m[i] = (m[i - 1] ^ m[i - 1] >> 30) + i | 0;
        }
    }

    /** Returns a random number in the 0..1 range. */
    export const random = () => Math.abs(rand() / 0x80000000);
}
