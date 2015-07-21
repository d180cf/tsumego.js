declare var WGo: {
    BasicPlayer: WGo.BasicPlayer;
    B: WGo.Color;
    W: WGo.Color;
};

declare module WGo {
    interface BasicPlayer {
        new (target: HTMLElement, options: Options);
        board: Board;
        setCoordinates(value: boolean): void;
    }

    interface Options {
        /** SGF as a text string. */
        sgf?: string;
    }

    interface Board {
        addObject(object: Object);
    }

    interface Object {
        x: number;
        y: number;
        c: Color;
    }

    type Color = number;    
}
