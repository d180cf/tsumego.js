// en.wikipedia.org/wiki/ANSI_escape_code#Colors

interface String {
    red(): string;
    green(): string;
    yellow(): string;
    blue(): string;
    magenta(): string;
    cyan(): string;
    white(): string;

    /** Removes ANSI escape codes. */
    clean(): string;
}

Object.assign(String.prototype, {
    red() {
        return isNode ? '\x1b[31;1m' + this + '\x1b[0m' : this;
    },

    green() {
        return isNode ? '\x1b[32;1m' + this + '\x1b[0m' : this;
    },

    yellow() {
        return isNode ? '\x1b[33;1m' + this + '\x1b[0m' : this;
    },

    blue() {
        return isNode ? '\x1b[34;1m' + this + '\x1b[0m' : this;
    },

    magenta() {
        return isNode ? '\x1b[35;1m' + this + '\x1b[0m' : this;
    },

    cyan() {
        return isNode ? '\x1b[36;1m' + this + '\x1b[0m' : this;
    },

    white() {
        return isNode ? '\x1b[37;1m' + this + '\x1b[0m' : this;
    },

    clean() {
        return this.replace(/\x1b\[(\d+;)*\d+m/gm, '');
    },
});
