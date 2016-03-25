namespace stats {
    declare const require;

    const _ = require('lodash');

    const pad = (x, n: number, c = ' ') => (c.repeat(n) + x).slice(-n);

    _.mixin({
        pie(data) {
            const sum = _.sum(data);
            return _.map(data, x => x / sum);
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

        console.log('\ntt guess success rate:\n' + src
            .filter(x => x.guess)
            .countBy(x => +!((x.guess ^ x.result) & 0x800000FF))
            .toSparseArray(0)
            .barChart()
            .value()
            .join('\n'));

        console.log('\nnumber of moves before a win:\n' + src
            .filter(x => x.result > 0)
            .countBy('trials')
            .toSparseArray(0)
            .barChart()
            .value()
            .join('\n'));

        console.log('\nnumber of moves before a loss:\n' + src
            .filter(x => x.result < 0)
            .countBy('trials')
            .toSparseArray(0)
            .barChart()
            .value()
            .join('\n'));
    }
}
