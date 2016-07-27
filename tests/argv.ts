namespace tests {
    const vals = [];

    const args: string[] = isNode ?
        // jake test[abc def] won't work (buggy jake!)
        // so semicolon can be used as the separator too
        process.argv.slice(2).join(' ').split(/[\s;]/) :
        location.search.slice(1).split('&');

    for (const a of args) {
        if (!a) continue;

        // jake test[abc=def] doesn't work either,
        // so `:` can replace `=` if necessary
        const [k, ...v] = a.split(/[=:]/);

        if (v.length < 1)
            vals.push(a);
        else
            vals[k] = a.slice(k.length + 1);
    }

    /**
     * node test qwerty foo:bar
     * /test?qwerty&foo:bar
     */
    export const argv: {
        [index: number]: string;
        unodes?: boolean;
        mode?: 'es5' | 'es6';
        log?: string;
    } = vals;

    console.log('args:', args);
    console.log('argv:', argv);
}
