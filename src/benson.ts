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

    /** A group of stones is unconditionally alive if there are
        two regions in which all vacant intersections are liberties
        of the group. Such regions are called "eyes" of the group. */
    export function alive(b: Board, root: XY) {
        const color = b.at(root.x, root.y);
        const sameColor = (s: XY) => b.at(s.x, s.y) * color > 0;
        const liberties: { [xy: string]: boolean } = {};

        for (const s of region(root, (t, s) => sameColor(s) && b.inBounds(t.x, t.y)))
            if (!b.at(s.x, s.y))
                liberties[xy2s(s)] = false;

        let eyes = 0;

        search: for (const ls in liberties) {
            const lib = s2xy(ls);

            for (const p of region(lib, (t, s) => !sameColor(t) && b.inBounds(t.x, t.y))) {
                const ps = xy2s(p);

                if (!b.at(p.x, p.y) && !(ps in liberties) || liberties[ps])
                    continue search;

                liberties[ps] = true;
            }

            if (++eyes > 1)
                return true;
        }

        return false;
    }
}
