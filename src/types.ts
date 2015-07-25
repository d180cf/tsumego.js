type int = number;
type uint = number;
type XIndex = uint;
type YIndex = uint;

/** Positive values = black.
    Negative values = white. */
type Color = int;

module Color {
    export const alias = (color: Color) => color > 0 ? 'B' : 'W';
}

/** (0, 0) corresponds to the top left corner. */
interface Move {
    x: XIndex;
    y: YIndex;
}

interface Result {
    color: int;

    /** Tells where in the path the repetition occured. */
    repd: number;

    /** The winning move.
        If the only solution is a loss, no move is stored. */
    move?: Move;
}
