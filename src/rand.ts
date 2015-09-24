module tsumego.rand {
    'use strict';

    export module LCG {
        /**     
         * The LCG has the max period iff:
         *  
         *  1. c and m are relatively prime
         *  2. (a - 1) is divisible by all prime factors of m
         *  3. (a - 1) is divisible by 4 if m is divisible by 4 
         *
         * https://en.wikipedia.org/wiki/Linear_congruential_generator
         */
        const LCG32 = (a: number, c: number) => (x: number) => () => x = (a * x + c) | 0;

        export const NR32 = LCG32(1664525, 1013904223);
        export const NR01 = (x: number, g = NR32(x)) => () => Math.abs(g()/0x80000000);
    }
}
