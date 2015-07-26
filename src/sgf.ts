/// <reference path="rdp.ts" />

module SGF {
    const $ = SDP.$;

    /**
     * Step ;FF[4]SZ[19] gets decomposed into
     *
     *      { FF: [4], SZ: [19] }
     */
    export interface Step {
        [tag: string]: string[];
    }

    /** 
     * Node FF[4]SZ[19](;B[aa];W[bb])(;B[ab];W[cb]) gets decomposed into:
     *
     *      steps[0]: { FF: [4], SZ:[19] }
     *      [0]: B[aa];W[bb]
     *      [1]: B[ab];W[cb]
     */
    export interface Node {
        steps: Step[];
        vars: Node[];
    }    

    /** Parses an SGF input and returns its AST. */
    export function parse(source: string): Node {
        /** "[bb]" -> "bb" */
        var val = $(/\s*/, /\[.*?\]/)
            .take(1)
            .map(s => s.slice(+1, -1));

        /** "AB[ce][dd][ff]" -> ["AB", ["ce", "dd", "ff"]] */
        var tag = $(/\s*/, /\w+/, val.rep())
            .map(r => r.slice(1));

        /** ";FF[4]SZ[19]" -> { FF: [4], SZ: [19] } */
        var step = $(/\s*;/, tag.rep())
            .take(1)
            .fold(0, 1);

        /** this is how sgf refers to itself */
        var sub = $('sgf', (s, i) => sgf.exec(s, i));

        /** "(;FF[4]SZ[19] (;W[aa];B[ab]) (;B[cd]))" -> Node */
        var sgf = $(/\s*\(/, step.rep(), sub.rep(), /\s*\)\s*/)
            .map(r => <Node>{ steps: r[1], vars: r[2] });

        return sgf.exec(source);
    }
}
