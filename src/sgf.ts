/// <reference path="rdp.ts" />

module SGF {
    /** Tag AW[bb][cb][cc] gets decomposed into:
     *
     *      [name] = AW
     *      [0] = bb
     *      [1] = cb
     *      [2] = cc
     *
     */
    export interface Tag {
        name: string;
        [valueIndex: number]: string;
    }

    /** 
     * Node FF[4](;B[aa];W[bb])(B[ab]W[cb]) gets decomposed into:
     *
     *      tags[0] = FF[4]
     *      [0] = B[aa];W[bb]
     *      [0] = B[ab]W[cb]
     */
    export interface Node {
        tags: Tag[];
        [variationIndex: number]: Node;
    }

    import $ = SDP.$;

    /** Parses an SGF input and returns its AST. */
    export function parse(source: string): Node {
        var val = $(/\[.*?\]/).map(s => s.slice(+1, -1));

        var tag = $([/\s*;/, /\w+/, $(val, 0)]).map(r => {
            const t: Tag = r[3];
            t.name = r[2];
            return t;
        });

        var sub = $('sgf', (s, i) => sgf.exec(s, i));

        var sgf = $([/\s*\(/, $(tag, 0), $(sub, 0), ')']).map(r => {
            const n: Node = r[3];
            n.tags = r[2];
            return n;
        });

        return sgf.exec(source);
    }
}
