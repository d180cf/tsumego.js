namespace stats {
    function* lines(path: string) {
        const fs = require('fs');
        const d = fs.openSync(path, 'r');

        try {
            let buffer = '', n = 0;
            const chunk = new Buffer(100);

            while (n = fs.readSync(d, chunk, 0, chunk.length)) {
                buffer += chunk.toString('utf8', 0, n);
                const lines = buffer.split(/\r?\n/);
                yield* lines.slice(0, -1);
                buffer = lines[lines.length - 1];
            }

            if (buffer)
                yield buffer;
        } finally {
            fs.closeSync(d);
        }
    }

    function* items(path: string) {
        for (const line of lines(path)) {
            if (line == '[' || line == '{}]')
                continue;

            if (line[line.length - 1] != ',')
                throw SyntaxError('Missing trailing comma: ' + line);

            try {
                yield JSON.parse(line.slice(0, -1));
            } catch (_) {
                throw SyntaxError('Invalid JSON: ' + line);
            }
        }
    }

    class Collection<T> {
        constructor(private items: IterableIterator<T>) {

        }

        [Symbol.iterator]() {
            return this.items;
        }

        slice(start: number, end?: number) {
            const items: T[] = [];

            let index = 0;

            for (const item of this) {
                if (index >= start)
                    items.push(item);

                index++;

                if (index >= end)
                    break;
            }

            return items;
        }

        filter(predicate: (item: T) => boolean) {
            const self = this;

            return new Collection((function* () {
                for (const item of self)
                    if (predicate(item))
                        yield item;
            })());
        }

        countBy(evaluate: (item: T) => any, percents = false) {
            const summary: any = {};

            let total = 0;

            for (const item of this) {
                const value = evaluate(item);
                summary[value] = (summary[value] || 0) + 1;
                total++;
            }

            if (percents) {
                for (const value in summary)
                    summary[value] /= total;
            }

            return summary;
        }
    }

    function query(path: string) {
        return new Collection(items(path));
    }

    export function analyze(path: string) {
        const started = Date.now();

        console.log('benson test recognizes an alive group:', query(path)
            .filter(x => 'benson' in x)
            .countBy(x => x.benson, true).true * 100 | 0, '%');

        console.log('tt guessed that it is a win:', query(path)
            .filter(x => x.guess && x.result * x.color > 0)
            .countBy(x => x.guess * x.color > 0, true).true * 100 | 0, '%');

        console.log('tt guessed the winning move:', query(path)
            .filter(x => x.guess && x.result * x.color > 0)
            // same coords and same color
            .countBy(x => !((x.guess ^ x.result) & 0x800000FF), true).true * 100 | 0, '%');

        console.log('tt guessed that it is a loss:', query(path)
            .filter(x => x.guess && x.result * x.color < 0)
            .countBy(x => x.guess * x.color < 0, true).true * 100 | 0, '%');

        console.log('the 1-st move is correct:', query(path)
            .filter(x => x.trials && x.result * x.color > 0)
            .countBy(x => x.trials == 1, true).true * 100 | 0, '%');

        const duration = Date.now() - started;
        console.log('Analysis took', (duration / 1000).toFixed(1).white() + 's');
    }
}
