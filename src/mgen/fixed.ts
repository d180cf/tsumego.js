module tsumego.mgen {
    /** Basic moves generator. Tries to maximize libs. */
    export function fixed(board: Board, rzone: stone[]): Generator {
        const sa = new MvsOrd(board);

        return (color: number) => {            
            const moves = sa.reset();

            for (const move of rzone)
                sa.insert(stone.x(move), stone.y(move), color);

            return moves;
        };
    }
}
