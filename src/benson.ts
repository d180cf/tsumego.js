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

    function contains(coords: XY[], {x, y}: XY) {
        for (const s of coords)
            if (x == s.x && y == s.y)
                return true;
        return false;
    }

    const neighbors = [[-1, 0], [+1, 0], [0, -1], [0, +1]];

    function* region(root: XY, belongs: (target: XY, source: XY) => boolean) {
        const body: XY[] = [];
        const edge = [root];

        while (edge.length > 0) {
            const xy = edge.pop();

            yield xy;
            body.push(xy);

            for (const [dx, dy] of neighbors) {
                const nxy = new XY(xy.x + dx, xy.y + dy);

                if (belongs(nxy, xy) && !contains(body, nxy) && !contains(edge, nxy))
                    edge.push(nxy);
            }
        }
    }

    /** A region is vital to a chain if all its empty intersections are liberties of that chain. */
    function isVital(board: Board, region: Iterable<XY>, liberties: XY[]) {
        for (const p of region) {
            if (board.at(p.x, p.y))
                continue;

            if (!contains(liberties, p))
                return false;
        }

        return true;
    }

    /** A group of stones is unconditionally alive if there are
        two regions in which all vacant intersections are liberties
        of the group. Such regions are called "eyes" of the group. */
    export function alive(b: Board, roots: XY[]) {
        const color = b.at(roots[0].x, roots[0].y);
        const sameColor = (s: XY) => b.at(s.x, s.y) * color > 0;
        const liberties: XY[] = [];

        for (const root of roots)
            for (const s of region(root, (t, s) => sameColor(s) && b.inBounds(t.x, t.y)))
                if (!b.at(s.x, s.y))
                    liberties.push(s);

        let eyes = 0;

        for (const lib of liberties) {
            const adjacent = region(lib, (target, source) => !sameColor(target));

            if (!isVital(b, adjacent, liberties))
                continue;

            if (++eyes > 1)
                return true;
        }

        return false;
    }
}
