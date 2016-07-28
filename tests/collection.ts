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
