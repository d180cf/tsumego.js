interface Error {
    reason?: Error;
}

namespace tests {
    export const sign = (x: number) => x > 0 ? +1 : x < 0 ? -1 : 0;

    export function ErrorWithReason(message: string, reason: Error) {
        const error = Error(message);
        error.reason = reason;
        throw error;
    }
}

namespace tests {
    const fs = require('fs');

    const path = argv.logfile;

    export const log = {
        path: path,
        stream: fs.createWriteStream(path),
        sgf: argv.logsgf,
        write(data) {
            this.stream.write(JSON.stringify(data));
            this.stream.write(',\n');
        }
    };

    log.stream.write('[\n');

    export const tdir: { [group: string]: { [test: string]: Function } } = {};
}

namespace tests.ut {
    export interface GroupContext {
        test(test: ($: typeof expect) => string | void, name?: string): void;
    }

    const fname = (f: Function) => /\/\/\/ (.+)[\r\n]/.exec(f + '')[1].trim();
    const md5: (text: string) => string = require('md5');

    export function group(init: ($: GroupContext) => void, gname = fname(init)) {
        const g = tdir[gname] = {};

        init({
            test(test, tname = fname(test)) {
                tname = md5(tname).slice(0, 6) + ' ' + tname;
                g[tname] = test;
            }
        });
    }
}

declare module NodeJS {
    interface Global {
        regeneratorRuntime: any;
        tsumego: typeof tsumego;
    }
}

try {
    require('source-map-support').install();

    if (!global.Symbol) {
        console.warn('loading Symbol polyfill');
        global.Symbol = require('es6-symbol');
    }

    try {
        new Function('!function*(){}');
    } catch (err) {
        console.warn('loading the regenerator runtime');
        global.regeneratorRuntime = require('../libs/regenerator-runtime');
    }
} catch (e) {
    console.warn(e);
}

module tests {
    if (argv.mode == 'es5') {
        console.log('loading the regenerator runtime...');
        global.regeneratorRuntime = require('../libs/regenerator-runtime');
        global.tsumego = require('../tsumego.es5');
    } else {
        global.tsumego = require('../tsumego.es6');
    }
}

module tests {
    // let the tests load and then run them
    setTimeout(() => {
        const filter = argv[0];

        if (filter)
            console.warn('tests filtered by: ' + JSON.stringify(filter));

        console.log('running tests...');

        const started = Date.now();

        tsumego.rand.seed(started | 0);
        console.log('rand seed:', '0x' + (2 ** 32 + (started | 0)).toString(16).slice(-8));

        const {npassed, nfailed} = run(tdir, filter);

        console.log('\nTotal:', npassed + nfailed, 'tests in', ((Date.now() - started) / 1000).toFixed(1) + 's');

        tsumego.profile.log();

        log.stream.end('{}]', () => {
            console.log('Stats:' + tsumego.stat.summarizxe().map(s => '\n   ' + s).join(''));

            // skip analysis if all tests are selected
            if (!argv.log) return;

            stats.analyze(log.path);

            // process.exit(0) somehow prevents stream
            // buffers from being flushed to files
            if (isNode && nfailed > 0)
                process.exit(1);
        });
    });
}