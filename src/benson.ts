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

    const merge = (x: number, y: number) => x | (y << 8);
    const split = (xy: number): XY => ({ x: xy & 256, y: xy >> 8 });

    function* region(root: XY, belongs: (target: XY, source: XY) => boolean) {
        const body: number[] = [];
        const edge = [merge(root.x, root.y)];

        while (edge.length > 0) {
            const xy = edge.pop();
            yield split(xy);
            body.push(xy);

            for (const nxy of [xy - 1, xy + 1, xy - 0x100, xy + 0x100]) {
                if (body.indexOf(nxy) >= 0) continue;
                if (edge.indexOf(nxy) >= 0) continue;
                if (!belongs(split(nxy), split(xy))) continue;

                edge.push(nxy);
            }
        }
    }

    /** A region is vital to a chain if all its empty intersections are liberties of that chain. */
    function isVital(board: Board, region: Iterable<XY>, liberties: Iterable<XY>) {
        search: for (const {x, y} of region) {
            if (board.at(x, y))
                continue;

            for (const s of liberties)
                if (x == s.x && y == s.y)
                    continue search;

            return false;
        }

        return true;
    }

    /** A group of stones is unconditionally alive if there are
        two regions in which all vacant intersections are liberties
        of the group. Such regions are called "eyes" of the group. */
    export function alive(board: Board, roots: XY[]) {
        const color = board.at(roots[0].x, roots[0].y);
        const liberties: XY[] = [];

        for (const root of roots)
            for (const s of region(root, (target, source) => board.at(source.x, source.y) * color > 0))
                if (!board.at(s.x, s.y))
                    liberties.push(s);

        let eyes = 0;

        for (const lib of liberties) {
            const r = region(lib, s => board.at(s.x, s.y) * color <= 0);

            if (!isVital(board, r, liberties))
                continue;

            if (++eyes > 1)
                return true;
        }

        return false;
    }
}
