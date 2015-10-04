module tsumego {
    export type int = number;
    export type uint = number;
    export type XIndex = uint;
    export type YIndex = uint;

    /** Positive values = black.
        Negative values = white. */
    export type Color = int;

    export module Color {
        export const alias = (color: Color) => color > 0 ? 'B' : 'W';
    }
}