/**
 * Implements the Benson's algorithm.
 *
 * Benson's Definition of Unconditional Life
 * http://senseis.xmp.net/?BensonsAlgorithm
 *
 * David B. Benson. "Life in the Game of Go"
 * http://webdocs.cs.ualberta.ca/~games/go/seminar/2002/020717/benson.pdf
 */
module tsumego.benson {
    'use strict';

    /** The flood fill algorithm which would better
        be implemented as a es6 generator. */
    function fill<Stone>(root: Stone,
        libs: (stone: Stone) => Stone[],
        test: (stone: Stone) => boolean) {

        const body: Stone[] = [];
        const edge: Stone[] = [root];

        while (edge.length > 0) {
            const stone = edge.pop();
            body.push(stone);

            for (const s of libs(stone)) {
                if (test(s) && body.indexOf(s) < 0 && edge.indexOf(s) < 0)
                    edge.push(s);
            }
        }
    }
        
    function alive<Stone>(root: Stone,
        libs: (stone: Stone) => Stone[],
        test: (stone: Stone) => boolean,
        vacant: (stone: Stone) => boolean) {

        const chain: Stone[] = [];
        const liberties: Stone[] = [];

        fill(root, libs, stone => {
            const inside = test(stone);
            if (inside)
                chain.push(stone);
            else
                liberties.push(stone);
            return inside;
        });

        const vital: Node[] = [];

        try {
            for (const stone in liberties) {
                try {
                    // check if all vacant nodes of the region
                    // are adjacent to the chain
                    fill(stone, libs, s => {
                        // escaped from the region
                        if (test(s))
                            return false;

                        // occupied by the opponent
                        if (!vacant(s))
                            return true;

                        // not a liberty of the group
                        if (liberties.indexOf(s) < 0)
                            throw false;

                        vital.push(s);

                        if (vital.length > 1)
                            throw true;
                    });
                } catch (r) {
                    if (r === true)
                        throw true;
                    if (r !== false)
                        throw r;
                }

                return false;
            }

            return false;
        } catch (r) {
            if (r === true)
                return true;
            throw r;
        }
    }

    /** A chain of stones is unconditionally alive if there are
        two regions in which all vacant intersections are liberties
        of the chain. */
    export function isAlive(board: Board, stone: XY) {
        const c = board.at(stone.x, stone.y);

        const libs = ({x, y}: XY) => {
            const nb: XY[] = [];

            const chk = (x, y) => {
                if (board.inBounds(x, y) && !board.at(x, y))
                    nb.push({ x: x, y: y });
            };

            chk(x - 1, y);
            chk(x + 1, y);
            chk(x, y - 1);
            chk(x, y + 1);

            return nb;
        };

        return alive(stone, libs,
            s => board.at(s.x, s.y) * c > 0,
            s => !board.at(s.x, s.y));
    }
}
