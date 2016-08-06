/// <reference path="search.ts" />
/// <reference path="solver.ts" />

module tsumego {
    declare const module, define, window;

    try {
        module.exports = tsumego; // node.js
    } catch (_) {
        try {
            define(tsumego); // AMD
        } catch (_) {
            window.tsumego = tsumego;
        }
    }
}
