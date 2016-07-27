/// <reference path="../libs/lodash.d.ts" />

declare module _ {
    interface LoDashImplicitObjectWrapper<T> {
        toSparseArray(defval: number): LoDashImplicitObjectWrapper<number[]>;
        barChart(): LoDashImplicitObjectWrapper<string[]>;
        percentage(): LoDashImplicitObjectWrapper<number[]>;
    }
}

namespace stats {
    declare const require;

    const _: _.LoDashStatic = require('lodash');

    const pad = (x, n: number, c = ' ') => (c.repeat(n) + x).slice(-n);

    _.mixin({
        percentage(data) {
            const sum = _.reduce(data, (a: number, b) => a + b, 0);
            return _.map(data, (x: number) => x / sum);
        },

        toSparseArray(data, defaultValue) {
            let max = 0;

            for (const key in data)
                if (+key > max)
                    max = +key;

            const a = [];

            for (let i = 0; i <= max; i++)
                a[i] = data[i] || defaultValue;

            return a;
        },

        barChart(data: number[]) {
            const s = _.sum(data);
            const n = 60;

            return _.map(data, (x, i) => `${pad(i, 2)} ${pad(x / s * 100 | 0, 2)}% ${'#'.repeat(x / s * n | 0)}`);
        }
    });

    export function analyze(json) {
        console.log('\nlog size:', json.length);

        const src = _(json);

        console.log('\nbenson test:\n' + src
            .filter(x => 'benson' in x)
            .countBy(x => +x.benson)
            .toSparseArray(0)
            .barChart()
            .value()
            .join('\n'));

        console.log('\ntt guessed that it is a win:', src
            .filter(x => x.guess && x.result * x.color > 0)
            .countBy(x => x.guess * x.color > 0)
            .percentage()
            .value()[1] * 100 | 0, '%');

        console.log('\ntt guessed the winning move:', src
            .filter(x => x.guess && x.result * x.color > 0)
            .countBy(x => !((x.guess ^ x.result) & 0x800000FF)) // same coords and same color
            .percentage()
            .value()[1] * 100 | 0, '%');

        console.log('\ntt guessed that it is a loss:', src
            .filter(x => x.guess && x.result * x.color < 0)
            .countBy(x => x.guess * x.color < 0)
            .percentage()
            .value()[1] * 100 | 0, '%');

        console.log('\nthe 1-st move is correct:', src
            .filter(x => x.trials && x.result * x.color > 0)
            .countBy('trials')
            .percentage()
            .value()[0] * 100 | 0, '%');

        console.log('\nnumber of moves before a loss:\n' + src
            .filter(x => x.result * x.color < 0)
            .countBy('trials')
            .toSparseArray(0)
            .barChart()
            .value()
            .join('\n'));
    }
}
