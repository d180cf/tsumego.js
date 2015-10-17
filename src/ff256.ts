/**
 * Implements the finite field GF(2**8).
 *
 * en.wikipedia.org/wiki/Finite_field_arithmetic
 * www.cs.utsa.edu/~wagner/laws/FFM.html
 */
namespace tsumego.ff256 {
    const mul3 = (x: number) => x ^ (x & 0x80 ? x ^ 0x8d : x) << 1; // x * 3

    const exp3 = new Array<number>(256); // exp3[x] = 3**x
    const log3 = new Array<number>(256); // y = exp3[x], x = log3[y]

    for (let x = 0, y = 1; x < 256; x++ , y = mul3(y))
        log3[exp3[x] = y] = x;

    export const mul = (a: number, b: number) => exp3[log3[a] + log3[b] & 255]; // a * b
    export const inv = (x: number) => exp3[255 ^ log3[x]]; // x * inv(x) = 1

    export const mul4 = (a: number, b: number) => b4(
        mul(b0(a), b0(b)),
        mul(b1(a), b1(b)),
        mul(b2(a), b2(b)),
        mul(b3(a), b3(b)));

    export const inv4 = (x: number) => b4(
        inv(b0(x)),
        inv(b1(x)),
        inv(b2(x)),
        inv(b3(x)));
}
