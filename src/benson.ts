/**
 * Implements the Benson's algorithm.
 *
 * Benson's Definition of Unconditional Life
 * senseis.xmp.net/?BensonsAlgorithm
 *
 * David B. Benson. "Life in the Game of Go"
 * webdocs.cs.ualberta.ca/~games/go/seminar/2002/020717/benson.pdf
 */
module tsumego.benson {
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
    export function alive(b: Board, root: stone, path: number[] = []) {
        const chainId = b.get(root);
        const sameColor = (s: stone) => b.get(s) * chainId > 0;
        const visited: { [move: number]: boolean } = [];

        let nEyes = 0;

        // enumerate all liberties of the chain to find two eyes among those liberties
        search: for (const lib of region(root, (t, s) => sameColor(s) && b.inBounds(t))) {
            // the region(...) above enumerates stones in the chain and the liberties
            if (b.get(lib))
                continue;

            // chains adjacent to the region
            const adjacent: number[] = [];
            const adjacentXY: stone[] = [];

            for (const p of region(lib, (t, s) => !sameColor(t) && b.inBounds(t))) {
                // has this region been already marked as non vital to this chain?
                if (visited[p])
                    continue search;

                visited[p] = true;

                let isAdjacent = false;

                for (const q of stone.neighbors(p)) {
                    const ch = b.get(q);

                    if (ch == chainId) {
                        isAdjacent = true;
                    } else if (ch * chainId > 0 && adjacent.indexOf(ch) < 0) {
                        adjacent.push(ch);
                        adjacentXY.push(q);
                    }
                }

                // is it an empty intersection that is not adjacent to the chain?
                if (!b.get(p) && !isAdjacent)
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
