// not implemented in IE/Edge as of Jul 2016
if (typeof Symbol === 'undefined') {
    console.warn('polyfilling Symbol...');

    window['Symbol'] = function Symbol(name) {
        return 'Symbol(' + name + ':' + Math.random().toString().slice(2) + ')';
    };

    Symbol.iterator = Symbol('iterator');
}

// not implemented in IE/Edge as of Jul 2016
if (typeof Promise === 'undefined') {
    console.warn('polyfilling Promise...');
    window['Promise'] = window['RSVP'].Promise; // let's use the rsvp polyfill...
}

// not implemented in IE/Edge as of Jul 2016
if (typeof Object.assign === 'undefined') {
    console.warn('polyfilling Object.assign...');

    Object.assign = function (lhs /* ...rhs */) {
        for (var i = 1; i < arguments.length; i++) {
            var rhs = arguments[i];

            if (rhs) {
                for (var key in rhs) {
                    lhs = lhs || {};
                    lhs[key] = rhs[key];
                }
            }
        }

        return lhs;
    };
}

// not implemented in IE/Edge as of Jul 2016
if (typeof Number.isFinite === 'undefined') {
    console.warn('polyfilling Number.isFinite...');

    Number.isFinite = function (x) {
        return typeof x == 'number' && x + 1 > x;
    };
}
