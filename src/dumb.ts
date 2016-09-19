module tsumego {
    // Filling in a own sure eye is not always a wrong move.
    // There is a curious example in which the only correct
    // move is to fill an own sure eye.
    //
    // Adrian B. Daniele, A Tsume-Go Life & Death Problem Solver
    // dspace.mit.edu/bitstream/handle/1721.1/50434/41567232-MIT.pdf
    //
    const patterns = [
        // a sure eye
        new Pattern([
            ' x x x ',
            ' x - x ',
            ' x x x '
        ]),

        // a sure eye
        new Pattern([
            ' x x ? ',
            ' x - x ',
            ' x x x '
        ]),

        // a sure eye
        new Pattern([
            ' x x x ',
            ' x - x ',
            ' # # # '
        ]),

        // a sure eye
        new Pattern([
            ' x x # ',
            ' x - # ',
            ' # # # '
        ]),

        // giving up a liberty
        new Pattern([
            ' O O O ',
            ' ? - - ',
            ' x x x '
        ]),

        // giving up a liberty
        new Pattern([
            ' O O O ',
            ' O - - ',
            ' ? x x '
        ]),

        // giving up a liberty
        new Pattern([
            ' ? O O ',
            ' x - - ',
            ' x x x '
        ]),

        // giving up a liberty
        new Pattern([
            ' # O O ',
            ' # - - ',
            ' # x x '
        ]),

        // giving up a liberty
        new Pattern([
            ' # # # ',
            ' # - x ',
            ' # O ? '
        ]),

        // giving up a liberty
        new Pattern([
            ' # # # ',
            ' ? - O ',
            ' O O O '
        ]),
    ];

    /**
     * Recognizes dumb moves that cannot possibly help.
     * For instance, filling in an own sure eye is a dumb move.
     */
    export function isDumb(board: Board, x: number, y: number, color: number, safe?: (s: stone) => boolean) {
        const snapshot = Pattern.take(board, x, y, color, safe);

        for (const p of patterns)
            if (p.test(snapshot))
                return true;

        return false;
    }
}
