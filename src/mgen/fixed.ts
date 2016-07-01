module tsumego.mgen {
    /** Basic moves generator. Tries to maximize libs. */
    export function fixed(board: Board, target: stone, maxsize = 25): Generator {
        const sa = new MvsOrd(board);
        const ts = board.get(target);
        const rzone = new stone.SmallSet;
        const same = (u, v) => board.inBounds(u) && board.inBounds(v) && board.get(u) * ts >= 0 && board.get(v) * ts >= 0;
        const neighbors = x => [...stone.diagonals(x), ...stone.neighbors(x)];

        //console.log('#0', stone.toString(target));

        for (const rs of region(target, same, neighbors))
            rs && rzone.add(rs);

        //console.log('#1', rzone + '');

        // blocks adjacent to rzone
        const adjacent: block[] = [];

        for (const rs of rzone.stones) {
            for (const ns of stone.neighbors(rs)) {
                const b = board.get(ns);

                if (b * ts < 0 && adjacent.indexOf(b) < 0)
                    adjacent.push(b);
            }
        }

        //console.log('#2', adjacent.map(block.toString));

        // blocks with all the libs in rzone
        const inner: block[] = [];

        test: for (const b of adjacent) {
            for (const [x, y] of board.libs(b))
                if (!rzone.has(stone(x, y, 0)))
                    continue test;

            inner.push(b);
        }

        //console.log('#3', inner.map(block.toString));

        for (const b of inner)
            for (const [x, y] of board.list(b))
                rzone.add(stone(x, y, 0));

        //console.log('#4', rzone + '');

        rzone.remove(s => board.get(s) == ts);

        //console.log('#5', rzone + '');

        if (rzone.stones.length > maxsize)
            throw new Error(`The number of possible moves ${rzone.stones.length} is more than ${maxsize}`);

        return (color: number) => {
            const moves = sa.reset();

            for (const move of rzone.stones)
                sa.insert(stone.x(move), stone.y(move), color);

            return moves;
        };
    }
}
