declare module eidogo {
    export interface Player {
        new (options);

        unsavedChanges: boolean;
        cursor: Cursor;

        /** A mysterious method which needs to be called
            after adding a comment for the current node :) */
        refresh(): void;

        /** "fb" means x = 5, y = 1 */
        createMove(xy: string);

        /** makes a pass */
        pass();

        /** undo the last move */
        back();
    }

    /** Points to the current SGF node? */
    export interface Cursor {
        node: Node;
    }

    /** Represents an SGF node? */
    export interface Node {
        /** C{Good for W] */
        C: string;
    }

    export interface Static {
        Player: Player;
    }
}

declare var eidogo: eidogo.Static;
