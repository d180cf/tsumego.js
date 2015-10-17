/**
 * The finite field GF(2**8) over 0x11b.
 *
 * en.wikipedia.org/wiki/Finite_field_arithmetic
 * www.cs.utsa.edu/~wagner/laws/FFM.html
 */
namespace tsumego.ff256 {
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
    export const div = (a: number, b: number) => mul(a, inv(b));
}

/**
 * Quaternions in GF(2**8).
 *
 * en.wikipedia.org/wiki/Quaternion
 * math.stackexchange.com/questions/7708/quaternion-division
 */
namespace tsumego.ff256.q {
    import m = ff256.mul;
    import i = ff256.inv;

    export const mul = (a: number, b: number) => {
        const [a0, a1, a2, a3] = b_(a);
        const [b0, b1, b2, b3] = b_(b);

        return b4(
            m(a0, b0) ^ m(a1, b1) ^ m(a2, b2) ^ m(a3, b3),
            m(a0, b1) ^ m(a1, b0) ^ m(a2, b3) ^ m(a3, b2),
            m(a0, b2) ^ m(a1, b3) ^ m(a2, b0) ^ m(a3, b1),
            m(a0, b3) ^ m(a1, b2) ^ m(a2, b1) ^ m(a3, b0));
    };

    export const inv = (a: number) => {
        const [a0, a1, a2, a3] = b_(a);
        // TODO: what if the sum is zero?
        const s = i(m(a0, a0) ^ m(a1, a1) ^ m(a2, a2) ^ m(a3, a3));
        return b4(m(s, a0), m(s, a1), m(s, a2), m(s, a3));
    };

    export const div = (a: number, b: number) => mul(a, inv(b));
}
