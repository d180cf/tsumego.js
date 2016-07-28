namespace stats {
    function $(path: string) {
        return new Collection(jsonfile.items(path));
    }

    export function analyze(path: string) {
        const started = Date.now();

        console.log('benson test recognizes an alive group:', $(path)
            .filter(x => 'benson' in x)
            .countBy(x => x.benson, true).true * 100 | 0, '%');

        console.log('tt guessed that it is a win:', $(path)
            .filter(x => x.guess && x.result * x.color > 0)
            .countBy(x => x.guess * x.color > 0, true).true * 100 | 0, '%');

        console.log('tt guessed the winning move:', $(path)
            .filter(x => x.guess && x.result * x.color > 0)
            // same coords and same color
            .countBy(x => !((x.guess ^ x.result) & 0x800000FF), true).true * 100 | 0, '%');

        console.log('tt guessed that it is a loss:', $(path)
            .filter(x => x.guess && x.result * x.color < 0)
            .countBy(x => x.guess * x.color < 0, true).true * 100 | 0, '%');

        console.log('the 1-st move is correct:', $(path)
            .filter(x => x.trials && x.result * x.color > 0)
            .countBy(x => x.trials == 1, true).true * 100 | 0, '%');

        const duration = Date.now() - started;
        console.log('Analysis took', (duration / 1000).toFixed(1).white() + 's');
    }
}
