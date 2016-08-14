module tests {
    function evsd(values: number[]) {
        let n = 0, s1 = 0, s2 = 0;

        for (const x of values) {
            n++;
            s1 += x;
            s2 += x * x;
        }

        const e = s1 / n; // expected value
        const v = s2 / n - e * e; // variance

        return [e, v ** 0.5];
    }

    export function run(tdir, filter: string) {
        let nfailed = 0;
        let npassed = 0;

        let indent = '';

        for (const gname in tdir) {
            const _indent = indent;
            console.log(indent + gname.cyan());
            indent += '  ';

            for (const tname in tdir[gname]) {
                if (filter && tname.indexOf(filter) < 0 && gname.indexOf(filter) < 0)
                    continue;

                const test = tdir[gname][tname];

                const logs = [], times = [];
                const _console_log = console.log;
                console.log = (...args) => { logs.push(args.map(<any>JSON.stringify)) };

                let err;

                try {
                    for (let n = argv.repeat; n > 0; n--) {
                        process.stdout.write(indent + tname + ' ' + n + ' to go...\r');
                        const started = new Date;
                        debugger;
                        test(expect);
                        const time = (Date.now() - +started) / 1000;
                        times.push(time)
                    }

                    npassed++;
                } catch (_) {
                    nfailed++;
                    err = _;
                }

                console.log = _console_log;

                const [tavg, tdev] = evsd(times);

                process.stdout.write(indent + tname);

                if (tavg > 1) {
                    process.stdout.write(' ' + tavg.toFixed(1));

                    if (tdev > tavg / 100)
                        process.stdout.write(' \xB1 ' + tdev.toFixed(1));

                    process.stdout.write(' s');
                }

                if (err)
                    process.stdout.write(' FAILED'.red());
                
                process.stdout.write(' '.repeat(20) + '\n');

                if (err) {
                    for (const args of logs)
                        console.log.apply(console, args.map(JSON.parse));

                    while (err) {
                        console.log(err && err.stack || err);
                        err = err.reason;
                    }
                }
            }

            indent = _indent;
        }

        return { npassed: npassed, nfailed: nfailed };
    }
}
