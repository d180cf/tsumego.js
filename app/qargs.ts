module testbench {
    interface QArgs {
        /** ?debug=W or ?debug=B to enters the debugging mode */
        debug: 'B' | 'W';

        /** Used to init the RNG. */
        rs: number;

        /** proof tree depth */
        ptd: number;

        /** Delays in ms between iterations when building a proof tree. */
        delay: number;

        /** Adds debug info to proof trees. */
        ptdi: boolean;

        /** Sets the ko master. */
        km: 'B' | 'W' | 'none';

        /** Enables the Benson's test. */
        benson: boolean;

        /** Draws moves that are being explored by the solver. Defaults to 4. */
        depth: number;

        /** Tells how often the debugger interrupts the solver. 250 (ms) by default. */
        freq: number;

        /** Once a tsumego is solved, the app can respond without clicking the solve button every time. */
        autorespond: boolean;

        /** In the auto respond mode checks if a response is needed indeed. */
        check: boolean;

        /** Enables drag & drop for the selected region. */
        dragdrop: boolean;
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

        if (qargs.autorespond === undefined)
            qargs.autorespond = true;

        if (qargs.check === undefined)
            qargs.check = true;

        console.log('qargs:', qargs);
    } catch (err) {
        console.warn('Failed to parse qargs:', err);
    }
}
