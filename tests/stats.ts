namespace stats {
    declare const require;

    const _ = require('lodash');

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
        }
    });

    export function analyze(json) {
        console.log('log size:', json.length);

        const src = _(json);

        console.log('number of moves before a win:', src
            .filter(x => x.result > 0)
            .countBy('trials')
            .toSparseArray(0)
            .pie()
            .value());

        console.log('number of moves before a loss:', src
            .filter(x => x.result < 0)
            .countBy('trials')
            .toSparseArray(0)
            .pie()
            .value());
    }
}
