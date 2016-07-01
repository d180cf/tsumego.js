module tsumego.mgen {
    class DistMap {
        private dist: number[] = [];

        public xmin = +Infinity;
        public xmax = -Infinity;
        public ymin = +Infinity;
        public ymax = -Infinity;

        get(x: number, y: number) {
            const d = this.dist[x | y << 4];
            return d || Infinity;
        }

        set(x: number, y: number, d: number) {
            if (d >= this.dist[x | y << 4])
                return;

            this.dist[x | y << 4] = d;

            if (x < this.xmin) this.xmin = x;
            if (x > this.xmax) this.xmax = x;
            if (y < this.ymin) this.ymin = y;
            if (y > this.ymax) this.ymax = y;
        }
    }

    /**
     * Distance-based moves generator.
     *
     * Generates moves that can be reached from the target
     * either by a solid connection or by capturing a block.
     */
    export function dist(board: Board, target: stone, maxdist = 3): Generator {
        ///console.log('created for', stone.toString(target), '\n' + board);
        const enum State { Draft = 1, Checked = 2 };

        // moves are same for both sides and determined by where the target can play
        const cache: { [board: number]: stone[] } = {};
        const reach: { [board: number]: stone[] } = {};
        const state: { [board: number]: State } = {};

        function getmoves(color: number): stone[] {
            const nocolor = cache[board.hash];

            if (!color)
                return nocolor;

            const ord = new MvsOrd(board);
            const moves = ord.reset();

            for (const s of nocolor)
                ord.insert(stone.x(s), stone.y(s), color);

            return moves;
        }

        return function generate(color: number, goal = State.Checked) {
            ///console.log('generate', color, goal, '\n' + board);

            if (state[board.hash] >= goal)
                return getmoves(color);

            const tblock = board.get(target);
            const dmap = new DistMap;

            ///console.log('target at', stone.toString(target), block.toString(tblock));

            if (!tblock) return [];

            if (!cache[board.hash]) {
                let [xmin, xmax, ymin, ymax] = block.dims(tblock);

                for (let d = 1; d <= maxdist; d++) {
                    for (let x = xmin; x <= xmax; x++) {
                        for (let y = ymin; y <= ymax; y++) {
                            const cblock = board.get(x, y);
                            const cdist = cblock == tblock ? 0 : dmap.get(x, y); // dist(target) = 0

                            // this iteration is supposed to make an extension from (d - 1) to d
                            if (d != cdist + 1)
                                continue;

                            // now find empty cells and enemy blocks adjacent to (x, y):
                            // empty cells get dist = d, enemy blocks with few libs are
                            // surrounded with dist = d + libs - 1
                            for (const [nx, ny] of board.neighbors(x, y)) {
                                const nb = board.get(nx, ny);

                                if (!nb) {
                                    // it's an empty cell
                                    dmap.set(nx, ny, d);

                                    // however if this cell is adjacent to a friendly block,
                                    // that block gets dist = d as well
                                    for (const [nnx, nny] of board.neighbors(nx, ny)) {
                                        if (nnx == nx && nny == ny)
                                            continue;

                                        const nnb = board.get(nnx, nny);

                                        if (nnb == tblock || nnb * tblock <= 0 || dmap.get(nnx, nny) <= d)
                                            continue;

                                        for (const [x, y] of board.list(nnb))
                                            dmap.set(x, y, d);
                                    }
                                } else if (nb * tblock < 0) {
                                    // it's an adjacent enemy block: check if it can be captured
                                    const rd = d + block.libs(nb) - (cblock ? 1 : 0);

                                    if (rd <= maxdist) {
                                        ///console.log('enemy at', nx, ny, rd, '\n' + board);
                                        // it can be captured: now every lib
                                        // of the block is considered to be
                                        // rd moves away from target block
                                        for (const [x, y] of board.edge(nb)) {
                                            const fb = board.get(x, y);

                                            // the target has d=0, no need to mark it with d=rd
                                            if (fb == tblock)
                                                continue;

                                            dmap.set(x, y, rd);

                                            // if the block being captured has other adjacent blocks,
                                            // those become reachable within rd steps as well                                            
                                            for (const [x1, y1] of board.list(fb))
                                                dmap.set(x1, y1, rd);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // this is suboptimal: the intent
                    // here is to get bounds of all cells
                    // with dist value not greater than d
                    xmin = dmap.xmin;
                    xmax = dmap.xmax;
                    ymin = dmap.ymin;
                    ymax = dmap.ymax;

                    ///console.log(`d=${d} x=${xmin}..${xmax} y=${ymin}..${ymax}`);
                }

                const moves: stone[] = [];
                const rzone: stone[] = [];

                // now get all the moves with d <= maxdist that can be actually played
                for (let x = xmin; x <= xmax; x++) {
                    for (let y = ymin; y <= ymax; y++) {
                        if (dmap.get(x, y) > maxdist)
                            continue;

                        // this is either a defender's stone or an empty cell
                        rzone.push(stone(x, y, 0));

                        if (board.play(stone(x, y, +1)) || board.play(stone(x, y, -1))) {
                            moves.push(stone(x, y, 0));
                            board.undo();
                        }
                    }
                }

                ///console.log('draft=' + stone.list.toString(moves), 'rzone=' + stone.list.toString(rzone), '\n' + board);
                cache[board.hash] = moves;
                reach[board.hash] = rzone;
                state[board.hash] = State.Draft;
            }

            if (goal == State.Checked) {
                const checked: stone[] = [];

                // now play out every found move, generate moves for the opponent
                // and check if the move still appears in that generated set; if
                // it doesn't appear there, this means that the opponent can block
                // the move and make it an overplay
                for (const move of cache[board.hash]) {
                    ///console.log('checking', stone.toString(move));
                    const nr = board.play(stone.setcolor(move, tblock));

                    // if the defender cannot play there, then the attacker can;
                    // also, capturing/defending a group always makes sense
                    if (nr != 1) {
                        if (nr > 0)
                            board.undo();
                        checked.push(move);
                        continue;
                    }

                    // the option to play on a liberty shouldn't be discarded
                    if (board.get(target) == board.get(move)) {
                        ///console.log('extension:', stone.toString(move));
                        board.undo();
                        checked.push(move);
                        continue;
                    }

                    // this move doesn't capture anything and doesn't extend the target block,
                    // so it's a distant move, i.e. d > 1; see if the defender can block it, i.e.
                    // respond in such a way that this move won't be reachable
                    let overplay = false;

                    // see how the opponent can respond to this move
                    for (const resp of generate(0, State.Draft)) {
                        ///console.log('blocking with', stone.toString(resp));
                        if (!board.play(stone.setcolor(resp, -tblock))) {
                            ///console.log('the opponent cannot play', stone.toString(resp));
                            continue;
                        }

                        generate(0, State.Draft);
                        const reachable = reach[board.hash] || [];
                        board.undo();

                        // if now the move is not reachable, then the opponent has a way to block it
                        if (reachable.indexOf(move) < 0) {
                            overplay = true;
                            ///console.log(stone.toString(move), 'blocked by', stone.toString(resp), '\n' + board);
                            break;
                        }
                    }

                    board.undo();

                    if (!overplay)
                        checked.push(move);
                }

                ///console.log('checked=' + stone.list.toString(checked), '\n' + board);
                cache[board.hash] = checked;
                state[board.hash] = State.Checked;
            }

            return getmoves(color);
        };
    }
}
