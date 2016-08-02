interface String {
    /**
     * "abc".pad(+5, ".") -> "abc.."
     * "abc".pad(-5, ".") -> "..abc"
     */
    pad(n: number, char?: string): string;
}

Object.assign(String.prototype, {
    pad(this: string, n: number, c = ' ') {
        if (n > 0 && this.length < +n)
            return this + c.repeat(+n - this.length);

        if (n < 0 && this.length < -n)
            return c.repeat(-n - this.length) + this;

        return this;
    }
});

