module tsumego.mgen {
    /** Basic moves generator. Tries to maximize libs. */
    export function fixed(board: Board, target: stone): Generator {
        const ts = board.get(target);
        const rzone = new stone.Set;
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
        const safeb: stone[] = [];

        test: for (const b of adjacent) {
            let n = 0;

            for (const [x, y] of board.libs(b)) {
                if (!rzone.has(stone.make(x, y, 0))) {
                    n++;

                    if (n > 1) {
                        // this block has libs outside the r-zone,
                        // so it won't be captured
                        for (const s of board.stones(b)) {
                            safeb.push(s);
                            break;
                        }

                        continue test;
                    }
                }
            }

            inner.push(b);
        }

        if (safeb.length < 1)
            throw Error('There must be a safe outer wall.');

        // and add those blocks to the rzone as they may be captured
        for (const b of inner) {
            for (const s of board.stones(b))
                rzone.add(stone.make(stone.x(s), stone.y(s), 0));

            for (const [x, y] of board.libs(b))
                rzone.add(stone.make(x, y, 0));
        }

        // remove the target block from the rzone
        rzone.remove(s => board.get(s) == ts);

        function safe(s: stone) {
            for (let i = 0; i < safeb.length; i++)
                if (safeb[i] * s > 0 && board.get(safeb[i]) == board.get(s))
                    return true;

            return false;
        }

        const moves_b: stone[] = [];
        const moves_w: stone[] = [];

        for (const s of rzone) {
            const x = stone.x(s);
            const y = stone.y(s);

            moves_b.push(stone.make(x, y, +1));
            moves_w.push(stone.make(x, y, -1));
        }

        return function expand(color: number) {
            return color > 0 ? moves_b : moves_w;
        };
    }
}
