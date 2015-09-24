/// <reference path="linalg.ts" />

/**
 * Artificial Neural Networks.
 *
 * https://en.wikipedia.org/wiki/Backpropagation
 */
module tsumego.ann {
    'use strict';

    import vector = linalg.vector;
    import matrix = linalg.matrix;

    const sigmoid0 = (x: number) => 1 / (1 + Math.exp(-x)); // S(x) = 1/(1 + 1/e**x)
    const sigmoid1 = (s: number) => s * (1 - s); // d/dx S(x) = S(x) * (1 - S(x))

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
        private weights: matrix[];
        private outputs: vector[];

        constructor(size: number) {
            this.weights = [];
            this.outputs = [vector.zero(size)];
        }

        /**
         * Adds a new layer and sets all connections as a matrix
         * with the latest layer. The size of the last layer must
         * match the number of columns in the matrix ad the size of
         * the new layer matches the number of rows.
         */
        add(layer: matrix | number) {
            const v = this.outputs[this.outputs.length - 1];

            if (typeof layer === 'number') {
                this.add(matrix.make(layer, v.length, () => Math.random() / layer * 2));
            } else {
                this.weights.push(layer);
                this.outputs.push(vector.zero(layer.length));
            }
        }

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
        apply(input: vector): vector {
            const vs = this.outputs;
            const ws = this.weights;
            const n = ws.length;

            vs[0] = input;

            for (let i = 0; i < n; i++)
                vs[i + 1] = matrix.mulv(ws[i], vs[i]).map(sigmoid0); // vs[i+1] = ws[i]*vs[i] | f'

            return vs[n];
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
        adjust(target: vector, k = 1.0) {
            const vs = this.outputs;
            const ws = this.weights;

            const v0 = vs[vs.length - 1];

            // d[n] = (vs[n] - t) : (vs[n] | f')
            let d = vector.dot2(
                vector.sum(v0, target, -1),
                v0.map(sigmoid1));

            for (let i = ws.length - 1; i >= 0; i--) {
                const w = ws[i];
                const v = vs[i];

                // dw[i] = -k * dyad(d[i + 1], v[i])
                ws[i] = matrix.sum(w, vector.dyad(d, v), -k);

                // d[i] = (w[i]^T * d[i + 1]) : (v[i] | f')
                d = vector.dot2(
                    matrix.mulv(matrix.transpose(w), d),
                    v.map(sigmoid1));
            }
        }
    }
}
