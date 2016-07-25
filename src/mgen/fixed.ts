module tsumego.mgen {
    /** Basic moves generator. Tries to maximize libs. */
    export function fixed(board: Board, target: stone): Generator {
        const sa = new MvsOrd(board, target);
        const ts = board.get(target);
        const rzone = new stone.SmallSet;
        const same = (u, v) => board.inBounds(u) && board.inBounds(v) && board.get(u) * ts >= 0 && board.get(v) * ts >= 0;
        const neighbors = x => [...stone.diagonals(x), ...stone.neighbors(x)];

        // get stones reachable with the 8 moves: direct + diagonal
        for (const rs of region(target, same, neighbors))
            rs && rzone.add(rs);

        // find blocks of the same color adjacent to rzone
        const adjacent: block[] = [];

        for (const rs of rzone) {
            for (const ns of stone.neighbors(rs)) {
                const b = board.get(ns);

                if (b * ts < 0 && adjacent.indexOf(b) < 0)
                    adjacent.push(b);
            }
        }

        // find blocks with all the libs in rzone
        const inner: block[] = [];

        test: for (const b of adjacent) {
            for (const [x, y] of board.libs(b))
                if (!rzone.has(stone.make(x, y, 0)))
                    continue test;

            inner.push(b);
        }

        // and add those blocks to the rzone as they may be captured
        for (const b of inner)
            for (const [x, y] of board.list(b))
                rzone.add(stone.make(x, y, 0));

        // remove the target block from the rzone
        rzone.remove(s => board.get(s) == ts);

        return (color: number) => {
            const moves = sa.reset();

            for (const move of rzone) {
                const x = stone.x(move);
                const y = stone.y(move);

                sa.insert(x, y, color);
            }

            return moves;
        };
    }
}
