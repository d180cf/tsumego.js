/**
 * Artificial Neural Networks.
 *
 * https://en.wikipedia.org/wiki/Backpropagation
 */
module tsumego.ann {
    const sigmoid0 = (x: number) => 1 / (1 + Math.exp(-x)); // S(x) = 1/(1 + 1/e**x)
    const sigmoid1 = (s: number) => s * (1 - s); // d/dx S(x) = S(x) * (1 - S(x))

    type vector = number[];
    type matrix = vector[];

    /** [for (i = 0; i < n; i++) f(i)] */
    const from = <T>(n: number, f: (i: number) => T) => {
        const a: T[] = new Array(n);

        for (let i = 0; i < n; i++)
            a[i] = f(i);

        return a;
    };

    /** vector dot product */
    const vdot = (u: vector, v: vector) => {
        let s = 0;

        for (let i = 0; i < u.length; i++)
            s += u[i] * v[i];

        return s;
    };

    /** vector dyad product */
    const dyad = (u: vector, v: vector) =>
        from(u.length, i =>
            from(v.length, j => u[i] * v[j]));

    /** w[i] = u[i] * v[i] */
    const dot2 = (u: vector, v: vector) =>
        from(u.length, i => u[i] * v[i]);

    /** matrix by vector multiplication */
    const mulv = (m: matrix, v: vector) =>
        from(m.length, i => vdot(m[i], v));

    /** u + k * v */
    const vsum = (u: vector, v: vector, k = 1) =>
        from(u.length, i => u[i] + k * v[i]);

    /** a + k * b */
    const msum = (a: matrix, b: matrix, k = 1) =>
        from(a.length, i => vsum(a[i], b[i], k));

    /** matrix transposition */
    const mtrs = (m: matrix) =>
        from(m[0].length, i =>
            from(m.length, j => m[i][j]));

    /**
     * The simplest layered ANN.
     *
     * A layer v[i] is just a vector of numbers (called neurons) in 0..1 range.
     * The first layer v[0] is the input of the net.
     * The last layer v[n] is the output of the net.
     * Matrix w[i] (called neuron connections) connects v[i] and v[i + 1]
     * via the following equation: v[i + 1] = g(v[i] * w[i]), where g is the
     * so called activation function and is meant to keep all numbers in 0..1 range.
     * In other words, v[n] = F(w)(v[0]) where F(w) is the net function.
     * Training of the net is the process of computing F(w) for
     * different inputs and adjusting w to get closer to desired outputs.
     */
    export class SimpleLayeredNetwork {
        layers: matrix[]; // layers[i] connects outputs[i] with outputs[i + 1]
        outputs: vector[]; // outputs[i + 1] = f(layers[i] * outputs[i])

        /**
         * Values are propagated by a simple rule:
         *
         *      v[i + 1] = w[i] * v[i] | f where
         *
         *          [x1, x2, ...] | f = [f(x1), f(x2), ...]
         *          f(x) = 1/(1 + exp(-x))
         *          f' = f * (1 - f)
         *
         * f(x) is choosen to keep values in 0..1 range.
         */
        apply(input: vector) {
            const vs = this.outputs;
            const ws = this.layers;

            vs[0] = input;

            for (let i = 0; i < ws.length; i++)
                vs[i + 1] = mulv(ws[i], vs[i]).map(sigmoid0); // vs[i+1] = ws[i]*vs[i] | f'
        }

        /**
         * This is the backpropagation algorithm which is quite simple.
         * If t is the desired output from v0, while the actual output is v[n],
         * we can adjust every w[i] by dw[i] to minimize E = (v[n] - t)^2/2. Since
         * gradient dE/dw points to the direction in which E increases, the opposite
         * direction reduces E, so we just need to find that gradient. The derivation
         * is quite simple and can be found in wikipedia. The final formulas are:
         *
         *      d[n] = (v[n] - t) : (v[n] | f') - this is d[n] for the last layer
         *      d[i] = (T(w[i]) * d[i + 1]) : (v[i] | f') - this is d[i] for the next layer
         *      dw[i] = -k * dE/dw = -k * dyad(d[i + 1], v[i]) - this is the adjustment
         *
         *      [x1, x2, ...] : [y1, y2, ...] = [x1*y1, x2*y2, ...]
         *      T(m) = transposition of m
         *      f' = f * (1 - f) which is true for f(x) = 1/(1 + exp(-x))
         *
         * So this algorithm starts with computing vector d[n] and then it goes back
         * one layer at a time to adjust w[i] and compute the next d[i].
         */
        adjust(target: vector, k = 0.75) {
            const vs = this.outputs;
            const ws = this.layers;

            const v0 = vs[vs.length - 1];
            let d0 = dot2(vsum(v0, target, -1), v0.map(sigmoid1)); // d[n] = (vs[n] - t) : (vs[n] | f')

            for (let i = ws.length - 1; i >= 0; i--) {
                const w = ws[i];
                const v = vs[i];

                ws[i] = msum(w, dyad(d0, v), -k); // dw[i] = -k * dyad(d[i + 1], v[i])
                d0 = dot2(mulv(mtrs(w), d0), v.map(sigmoid1)); // d[i] = (w[i]^T * d[i + 1]) : (v[i] | f')
            }
        }
    }
}
