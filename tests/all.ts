/// <reference path="../tsumego.d.ts" />
/// <reference path="../libs/node.d.ts" />

/// <reference path="isnode.ts" />
/// <reference path="colors.ts" />
/// <reference path="argv.ts" />
/// <reference path="infra.ts" />
/// <reference path="console.tree.ts" />
/// <reference path="stats.ts" />
/// <reference path="../libs/json-file.ts" />
/// <reference path="collection.ts" />
/// <reference path="es6aiter.ts" />
/// <reference path="ascii-board.ts" />

/// <reference path="src/dist.ts" />
/// <reference path="src/fixed.ts" />
/// <reference path="src/utils.ts" />
/// <reference path="src/gf2.ts" />
/// <reference path="src/sgf.ts" />
/// <reference path="src/dcnn.ts" />
/// <reference path="src/board.ts" />
/// <reference path="src/uceyes.ts" />
/// <reference path="src/search.ts" />
/// <reference path="src/benson.ts" />

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