declare var WGo: {
    BasicPlayer: WGo.BasicPlayer;
    KNode: WGo.KNode;
    B: WGo.Color;
    W: WGo.Color;
};

declare module WGo {
    interface BasicPlayer {
        new (target: HTMLElement, options: BasicPlayer.Options): BasicPlayer;

        board: Board;
        kifuReader: KifuReader;

        next(nodeIndex: number): void;
        previous(): void;
        setCoordinates(value: boolean): void;
    }

    module BasicPlayer {
        interface Options {
            /** SGF as a text string. */
            sgf?: string;
        }
    }

    interface KifuReader {
        game: Game;
        node: KNode;
    }

    interface Game {
        turn: Color;
    }

    interface Board {
        addObject(object: Object);
    }

    interface Object {
        x: number;
        y: number;
        c: Color;
    }

    interface KNode {
        new (options: KNode.Options): KNode;
        children: KNode[];
        appendChild(node: KNode): void;
    }

    module KNode {
        interface Options {
            _edited: boolean;
            move: {
                pass?: boolean;
                x?: number;
                y?: number;
                c?: Color;
            };
        }
    }

    type Color = number;    
}
