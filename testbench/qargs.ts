module testbench {
    interface QArgs {
        /** Enters the debugging mode. Use F10, F11 and Shift+F11 to debug the solver. */
        debug: boolean;

        /** Used to init the RNG. */
        rs: number;

        /** Displays the ko-master toggle. Normally the solver doesn't need this help. */
        km: boolean;

        /** Enables the Benson's test. */
        benson: boolean;
    }

    export const qargs: QArgs = <any>{};

    try {
        for (const pair of location.search.slice(1).split('&')) {
            if (!pair)
                continue;

            const [key, val] = pair.split('=').map(s => s.replace(/\+/g, ' ')).map(decodeURIComponent);

            try {
                qargs[key] = val && JSON.parse(val);
            } catch (err) {
                qargs[key] = val;
            }
        }

        console.log('qargs:', qargs);
    } catch (err) {
        console.log('Failed to parse qargs:', err);
    }
}
