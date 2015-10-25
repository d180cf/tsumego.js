/**
 * The galois finite field GF(2**8) over 2**8 + 0x1b.
 *
 * en.wikipedia.org/wiki/Finite_field_arithmetic
 * www.cs.utsa.edu/~wagner/laws/FFM.html
 */
namespace tsumego.gf8 {
    const mul3 = (x: number) => x ^ (x & 0x80 ? x << 1 ^ 0x11b : x << 1); // x * 3

    const exp3 = new Array<number>(256); // exp3[x] = 3**x
    const log3 = new Array<number>(256); // y = exp3[x], x = log3[y]

    for (let x = 0, y = 1; x < 256; x++ , y = mul3(y))
        log3[exp3[x] = y] = x;

    log3[1] = 0;

    const invt = log3.map(x => exp3[255 - x]); // x * inv1[x] = 1
    const cut = (x: number) => x > 255 ? x - 255 : x;

    export const mul = (a: number, b: number) => a && b && exp3[cut(log3[a] + log3[b])];
    export const inv = (a: number) => invt[a];
}

/** 
 * The galois finite field GF(2**32) over 2**32 + 0x8d. 
 *
 * en.wikibooks.org/wiki/Algorithm_Implementation/Mathematics/Extended_Euclidean_algorithm
 * search.cpan.org/~dmalone/Math-FastGF2-0.04/lib/Math/FastGF2.pm
 */
namespace tsumego.gf32 {
    /** x * 2**n */
    const shl = (x, n = 1) => {
        while (n-- > 0)
            x = x << 1 ^ (x < 0 ? 0x8d : 0); // x * 2 + m
        return x;
    };

    /** a * b */
    export const mul = (a: number, b: number) => {
        let ab = 0;

        while (b) {
            if (b & 1)
                ab ^= a;

            b >>>= 1;
            a = shl(a);
        }

        return ab;
    };

    const rank = x => {
        let n = 0;
        while (x) x >>>= 1, n++;
        return n;
    };

    /** [x, y] where a*x + b*y = gcd(a, b) */
    const egcd = (a, b, rb) => {
        if (a == 1)
            return [1, 0];

        const ra = rank(a);
        const n = rb - ra;

        if (n < 0) {
            const [y, x] = egcd(b, a, ra);
            return [x, y];
        } else {
            const [y, z] = egcd(b ^ a << n, a, ra);
            return [z ^ shl(y, n), y];
        }
    };

    /** x where a*x = 1 */
    export const inv = (a: number): number => a && egcd(a, 0x8d, 33)[0];

    /** x where b*x = a */
    export const div = (a: number, b: number): number => mul(a, inv(b));
}
