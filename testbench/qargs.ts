module testbench {
    interface QArgs {
        /** ?debug=W or ?debug=B to enters the debugging mode */
        debug: 'B' | 'W';

        /** Used to init the RNG. */
        rs: number;

        /** Sets the ko master. */
        km: 'B' | 'W' | 'none';

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
                qargs[key] = val ? JSON.parse(val) : undefined;
            } catch (err) {
                qargs[key] = val;
            }
        }

        console.log('qargs:', qargs);
    } catch (err) {
        console.log('Failed to parse qargs:', err);
    }
}
