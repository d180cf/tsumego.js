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

    /** 
     * A chain of stones is said to be pass-alive or unconditionally alive
     * if the opponent cannot capture the chain even if the chain is not defended.
     *
     * In this implementation a chain is considered to be pass-alive if it has two eyes.
     * An eye is an adjacent region of either empty intersections or the opponent's
     * stones in which:
     *
     *  1. All empty intersections are adjacent to the chain.
     *  2. All chains adjacent to the region are also pass-alive.
     *
     * If the two requirements are met, the opponent cannot approach the chain from inside
     * the region and thus cannot capture the chain since there are two such regions.
     */
    export function alive(b: Board, root: XY, path: number[] = []) {
        const chainId = b.chainAt(root.x, root.y);
        const sameColor = (s: XY) => b.at(s.x, s.y) * chainId > 0;
        const visited = []; // [x | y << 5] = true/undefined

        let nEyes = 0;

        // enumerate all liberties of the chain to find two eyes among those liberties
        search: for (const lib of region(root, (t, s) => sameColor(s) && b.inBounds(t.x, t.y))) {
            // the region(...) above enumerates stones in the chain and the liberties
            if (b.chainAt(lib.x, lib.y))
                continue;

            // chains adjacent to the region
            const adjacent: number[] = [];
            const adjacentXY: XY[] = [];

            for (const p of region(lib, (t, s) => !sameColor(t) && b.inBounds(t.x, t.y))) {
                const coord = p.x | p.y << 5;

                // has this region been already marked as non vital to this chain?
                if (visited[coord])
                    continue search;

                visited[coord] = true;

                let isAdjacent = false;

                for (const [dx, dy] of nesw) {
                    const nx = p.x + dx;
                    const ny = p.y + dy;
                    const ch = b.chainAt(nx, ny);

                    if (ch == chainId) {
                        isAdjacent = true;
                    } else if (ch * chainId > 0 && adjacent.indexOf(ch) < 0) {
                        adjacent.push(ch);
                        adjacentXY.push({ x: nx, y: ny });
                    }
                }

                // is it an empty intersection that is not adjacent to the chain?
                if (!b.chainAt(p.x, p.y) && !isAdjacent)
                    continue search;
            }

            // check that all adjacent chains are also alive
            for (let i = 0; i < adjacent.length; i++) {
                const ch = adjacent[i];
                // if a sequence of chains form a loop, they are all alive
                if (path.indexOf(ch) < 0 && !alive(b, adjacentXY[i], [...path, ch]))
                    continue search;
            }

            if (++nEyes > 1)
                return true;
        }

        return false;
    }
}
