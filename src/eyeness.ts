module tsumego {
    const kWhite = 1 << 31; // the sign bit, as usual
    const kEmpty = 1 << 30;
    const kSafe = 1 << 29; // tells that the stone belongs to teh outer wall
    const kWall = 1 << 28;
    const kHash = (1 << 28) - 1; // 28 bits give 270 M values

    export function eyeness(board: Board, rzone: stone[], safeb: stone[]) {
        const area = sequence(256, 0);
        const size = board.size;

        function get(x: number, y: number) {
            if (!board.inBounds(x, y))
                return kWall;

            const d = area[x | y << 4];

            if ((d & kHash) == (~board.hash & kHash))
                return d;

            const b = board.get(x, y);

            let q = b & kWhite | ~board.hash & kHash;

            if (!b) {
                q |= kEmpty;
            } else {
                for (let i = 0; i < safeb.length; i++)
                    if (board.get(safeb[i]) == b)
                        q |= kSafe;
            }

            return area[x | y << 4] = q;
        }

        function enemy(x: number, y: number, color: color) {
            const d = get(x, y);
            return !(d & kEmpty) && !(d & kWall) && d * color < 0;
        }

        function enemysafe(x: number, y: number, color: color) {
            return enemy(x, y, color) && ((get(x, y) & kSafe) != 0);
        }

        function edge(x: number, y: number) {
            return x == 0 || x + 1 == size || y == 0 || y + 1 == size;
        }

        function test(x: number, y: number, target: color) {
            const d = get(x, y);

            if (d & kWall) {
                // not an eye for sure
                return false;
            } else if (d & kEmpty) {
                // if the empty point has an adjacent stone
                // of the opposite color, an eye cannot be
                // formed there because in order to make an eye,
                // that stone would need to be captured first
                if (enemy(x - 1, y, target) ||
                    enemy(x + 1, y, target) ||
                    enemy(x, y - 1, target) ||
                    enemy(x, y + 1, target))
                    return false;

                if (edge(x, y)) {
                    // if an empty point is on the edge and 
                    // there is a diagonally adjacent safe
                    // stone of the opposite color, the eye
                    // is called false; however there are
                    // rare cases when two false eyes form
                    // an alive shape: those rare cases are
                    // ignored here
                    if (enemysafe(x + 1, y + 1, target) ||
                        enemysafe(x + 1, y - 1, target) ||
                        enemysafe(x - 1, y - 1, target) ||
                        enemysafe(x - 1, y + 1, target))
                        return false;

                    return true;
                } else {
                    const n =
                        (enemysafe(x + 1, y + 1, target) ? 1 : 0) +
                        (enemysafe(x + 1, y - 1, target) ? 1 : 0) +
                        (enemysafe(x - 1, y - 1, target) ? 1 : 0) +
                        (enemysafe(x - 1, y + 1, target) ? 1 : 0);

                    // if an empty point has two diagonally adjacent
                    // safe stones of the opposite color, the eye at
                    // that point is false; there are cases when groups
                    // with two false eyes live: those rare cases are
                    // ignored here
                    return n < 2;
                }
            } else if (d * target < 0) {
                // a stone of the opposite color
                // can be captured to make an eye,
                // unless that stone is safe
                return (d & kSafe) == 0;
            } else {
                return false;
            }
        }

        return function _eyeness(target: color) {
            let result = 0;

            for (let i = 0; i < rzone.length; i++) {
                const s = rzone[i];
                const x = stone.x(s);
                const y = stone.y(s);

                if (test(x, y, target))
                    result++;
            }

            return result;
        }
    }
}
