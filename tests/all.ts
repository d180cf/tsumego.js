namespace tests {
    console.log('\nTotal:', ((Date.now() - _dt0) / 1000).toFixed(1).white() + 's');

    tsumego.profile.log();

    declare const require;

    log.stream.end('{}]', () => {
        // skip analysis if all tests are selected
        if (!argv.log) return;

        stats.analyze(log.path);

        // process.exit(0) somehow prevents stream
        // buffers from being flushed to files
        if (isNode && ut.failed)
            process.exit(1);
    });
}