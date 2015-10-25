/// <reference path="../src/solver.ts" />

/// <reference path="infra.ts" />
/// <reference path="es6aiter.ts" />

/// <reference path="src/utils.ts" />
/// <reference path="src/gf2.ts" />
/// <reference path="src/sgf.ts" />
/// <reference path="src/ann.ts" />
/// <reference path="src/board.ts" />
/// <reference path="src/uceyes.ts" />
/// <reference path="src/solver.ts" />
/// <reference path="src/benson.ts" />

namespace tests {
    console.log('\nTotal:', ((Date.now() - _dt0) / 1000).toFixed(1).white() + 's');

    tsumego.profile.log();

    if (isNode)
        process.exit(ut.failed ? 1 : 0);
}