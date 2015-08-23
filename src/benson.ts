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

    interface Predicate<T> {
        (value: T): boolean;
    }

    /** The flood fill algorithm which would better
        be implemented as a es6 generator. */
    function fill<Node>(
        /** Where the search starts. */ root: Node,
        /** Tells where the search can continue. */ libs: (node: Node) => Node[],
        /** Tells where the search should stop. */ next: (stone: Node,
            /** Return this if the stone belongs to the group. */ take,
            /** Return this if the stone doesn't belong to the group. */ exit) => any) {
        const body: Node[] = [];
        const edge: Node[] = [root];

        const kTake = {};
        const kExit = {};

        while (edge.length > 0) {
            const stone = edge.pop();
            body.push(stone);

            for (const s of libs(stone)) {
                if (body.indexOf(s) >= 0) continue;
                if (edge.indexOf(s) >= 0) continue;

                const r = next(s, kTake, kExit);

                if (r === kTake)
                    edge.push(s);
                else if (r !== kExit)
                    return r;
            }
        }
    }

    function has2eyes<Coords>(
        /** One stone from each chain. */ roots: Coords[],
        /** Gives the 4 libs of a stone. */ libs: (stone: Coords) => Coords[],
        /** Tells where to stop. */ test: Predicate<Coords>,
        /** Tells if a location is unoccupied. */ vacant: Predicate<Coords>) {
        const chain: Coords[] = [];
        const liberties: Coords[] = [];

        for (const root of roots) {
            fill(root, libs, (stone, kTake, kExit) => {
                const inside = test(stone);
                if (inside)
                    chain.push(stone);
                else
                    liberties.push(stone);
                return inside ? kTake : kExit;
            });
        }

        const vital: Coords[] = [];

        for (const stone in liberties) {
            // check if all vacant nodes of the region
            // are adjacent to the chain
            const twoEyes = fill(stone, libs, (s, kTake, kExit) => {
                // escaped from the region
                if (test(s))
                    return kExit;

                // occupied by the opponent
                if (!vacant(s))
                    return kTake;

                // not a liberty of the group
                if (liberties.indexOf(s) < 0)
                    return false;

                vital.push(s);

                if (vital.length > 1)
                    return true;
            });

            if (twoEyes)
                return true;
        }

        return false;
    }

    /** A group of stones is unconditionally alive if there are
        two regions in which all vacant intersections are liberties
        of the group. Such regions are called "eyes" of the group. */
    export function alive(board: Board, stones: XY[]) {
        const color = board.at(stones[0].x, stones[0].y);

        function libs({x, y}: XY) {
            const nb: XY[] = [];

            const add = (x, y) => {
                if (board.inBounds(x, y) && !board.at(x, y))
                    nb.push({ x: x, y: y });
            };

            add(x - 1, y);
            add(x + 1, y);
            add(x, y - 1);
            add(x, y + 1);

            return nb;
        }

        return has2eyes(stones, libs,
            s => board.at(s.x, s.y) * color > 0,
            s => !board.at(s.x, s.y));
    }
}
