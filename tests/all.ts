/// <reference path="infra.ts" />
/// <reference path="es6aiter.ts" />
/// <reference path="../src/solver.ts" />

/// <reference path="sgf.ts" />
/// <reference path="board.ts" />
/// <reference path="uceyes.ts" />
/// <reference path="solver.ts" />
/// <reference path="benson.ts" />

declare const process;

if (typeof process !== 'undefined')
    process.exit(ut.failed ? 1 : 0);
