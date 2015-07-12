declare module eidogo {
    export interface Player {
        new (options);

        /** "fb" means x = 5, y = 1 */
        createMove(xy: string);

        /** makes a pass */
        createMove();

        /** undo the last move */
        back();
    }

    export interface Static {
        Player: Player;
    }
}

declare var eidogo: eidogo.Static;
