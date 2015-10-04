/// <reference path="infra.ts" />
/// <reference path="es6aiter.ts" />
/// <reference path="../src/solver.ts" />

/// <reference path="utils.ts" />
/// <reference path="sgf.ts" />
/// <reference path="ann.ts" />
/// <reference path="board.ts" />
/// <reference path="uceyes.ts" />
/// <reference path="solver.ts" />
/// <reference path="benson.ts" />

console.log(`\nTotal: ${((Date.now() - _dt0) / 1000).toFixed(1) }s`);

tsumego.profile.log();

declare const process;

if (typeof process !== 'undefined')
    process.exit(ut.failed ? 1 : 0);
