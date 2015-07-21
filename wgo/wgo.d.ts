declare var WGo: {
    BasicPlayer: WGo.BasicPlayer
};

declare module WGo {
    export interface BasicPlayer {
        new (target: HTMLElement, options: Options);

        setCoordinates(value: boolean): void;
    }

    interface Options {
        /** SGF as a text string. */
        sgf?: string;
    }
}
