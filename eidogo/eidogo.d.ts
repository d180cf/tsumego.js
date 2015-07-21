declare module eidogo {
    export interface Player {
        new (options);

        unsavedChanges: boolean;

        board: {
            commit(): void;
            render(): void;
        };

        /** Points to the current SGF node? */
        cursor: {
            node: {
                /** In SGF: `;C[Good for W]` */
                C: string;
            };
        };

        /** 'B' | 'W' */
        currentColor: string;

        /** A mysterious method which needs to be called
            after adding a comment for the current node :) */
        refresh(): void;

        /** "fb" means x = 5, y = 1 */
        createMove(xy: string);

        /** addMarker("ca", "SQ"); */
        addMarker(xy: string, marker: string);

        /** makes a pass */
        pass();

        /** undo the last move */
        back();
    }
}

declare var eidogo: {
    Player: eidogo.Player;
};
