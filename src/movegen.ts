module tsumego {
    export module generators {
        /** Basic moves generator. Tries to maximize libs. */
        export function Basic(rzone: stone[], random = rand.LCG.NR01(Date.now())) {
            /** Defines the order in which the solver considers moves. */
            const sa = new SortedArray<stone, { r: number; p: number; q: number }>((a, b) =>
                a.r >= b.r && // maximize the number of captured stones first
                a.p >= b.p && // then maximize the number of own liberties
                a.q <= b.q && // then minimize the number of the opponent's liberties
                random() > 0.5);

            return (board: Board, color: number) => {
                const leafs = sa.reset();

                for (const move of rzone) {
                    const [x, y] = stone.coords(move);

                    if (!Pattern.isEye(board, x, y, color)) {
                        const s = stone(x, y, color);
                        const r = board.play(s);

                        if (!r) continue;

                        // the three parameters can be easily packed
                        // in one 32 bit number, but packing and unpacking
                        // will only slow things down
                        sa.insert(s, {
                            r: r,
                            p: sumlibs(board, color),
                            q: sumlibs(board, -color),
                        });

                        board.undo();
                    }
                }

                return leafs;
            };
        }
    }

    export function sumlibs(board: Board, color: number) {
        let outer = 0;

        for (let i = 1; i < board.blocks.length; i++) {
            const b = board.blocks[i];

            if (block.size(b) > 0 && b * color > 0)
                outer = outer ? block.join(outer, b) : b;
        }

        let [xmin, xmax, ymin, ymax] = block.rect(outer);

        if (xmin > 0) xmin--;
        if (ymin > 0) ymin--;
        if (xmax < board.size - 1) xmax++;
        if (ymax < board.size - 1) ymax++;

        let total = 0;

        for (let x = xmin; x <= xmax; x++) {
            for (let y = ymin; y <= ymax; y++) {
                if (!board.get(x, y)) {
                    const isnb =
                        board.get(x - 1, y) * color > 0 ||
                        board.get(x + 1, y) * color > 0 ||
                        board.get(x, y - 1) * color > 0 ||
                        board.get(x, y + 1) * color > 0;

                    if (isnb)
                        total++;
                }
            }
        }

        return total;
    }

    export function eulern(board: Board, color: number, q: number = 2) {
        let n1 = 0, n2 = 0, n3 = 0;

        for (let x = -1; x <= board.size; x++) {
            for (let y = -1; y <= board.size; y++) {
                const a = +((board.get(x, y) * color) > 0);
                const b = +((board.get(x + 1, y) * color) > 0);
                const c = +((board.get(x + 1, y + 1) * color) > 0);
                const d = +((board.get(x, y + 1) * color) > 0);

                switch (a + b + c + d) {
                    case 1: n1++; break;
                    case 2: if (a == c) n2++; break;
                    case 3: n3++; break;
                }
            }
        }

        return (n1 - n3 + q * n2) / 4;
    }
}
