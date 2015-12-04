module tsumego {
    // en.wikipedia.org/wiki/Linear_congruential_generator
    // en.wikipedia.org/wiki/Numerical_Recipes
    var x = Date.now() | 0, a = 1664525, c = 1013904223;

    /** Returns a random 32 bit number. */
    export function rand() {
        return x = (a * x + c) | 0;
    }

    export namespace rand {
        /**
         * By default it's initialized to Date.now(), but
         * can be changed to something else before using
         * the solver.
         */
        export const seed = (value: number) => x = value;
    }

    /** Returns a random number in the 0..1 range. */
    export const random = () => Math.abs(rand() / 0x80000000);
}
