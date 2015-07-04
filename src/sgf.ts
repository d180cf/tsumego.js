/// <reference path="rdp.ts" />

module SGF {
    const $ = SDP.$;

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
        vals: string[];
    }

    /** 
     * Node FF[4](;B[aa];W[bb])(B[ab]W[cb]) gets decomposed into:
     *
     *      tags[0] = FF[4]
     *      [0] = B[aa];W[bb]
     *      [0] = B[ab]W[cb]
     */
    export interface Node {
        tags: Tag[][];
        vars: Node[];
    }    

    /** Parses an SGF input and returns its AST. */
    export function parse(source: string): Node {
        /** [bb] */
        var val = $(/\[.*?\]/).map(s => s.slice(+1, -1));
        /** FF[4] */
        var tag = $([/\s*/, /\w+/, val.rep()]).map(r => <Tag>{ name: r[1], vals: r[2] });
        /** ;FF[4]SZ[19] */
        var tags = $([/\s*;/, tag.rep()]).take(1);
        /** this is how sgf refers to itself */
        var sub = $('sgf', (s, i) => sgf.exec(s, i));
        var sgf = $([/\s*\(/, tags.rep(), sub.rep(), /\)\s*/]).map(r => <Node>{ tags: r[1], vars: r[2] });

        return sgf.exec(source);
    }
}
