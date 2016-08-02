module tsumego.mgen {
    export interface Generator {
        (color: number): stone[];
    }

    export function sumlibs(board: Board, color: number) {
        let n = 0;

        for (const b of board.blocks)
            if (b * color > 0)
                n += block.libs(b);

        return n;
    }

    export function ninatari(board: Board, color: number) {
        let n = 0;

        for (let i = 1; i < board.blocks.length; i++) {
            const b = board.blocks[i];

            if (block.size(b) > 0 && b * color > 0 && block.libs(b) == 1)
                n++;
        }

        return n;
    }
}

