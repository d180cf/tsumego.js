/// <reference path="rdp.ts" />

/**
 * SGF parser.
 *
 * http://www.red-bean.com/sgf/
 */
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
     *      vars[0]: B[aa];W[bb]
     *      vars[1]: B[ab];W[cb]
     */
    export interface Node {
        steps: Step[];
        vars: Node[];
    }    

    /** 
     * Parses an SGF input according to these rules:
     *
     *      val = `[` ... `]`
     *      tag = 1*(`A`..`Z`) *val
     *      stp = `;` *tag
     *      sgf = `(` *stp *sgf `)`
     *
     * Returns AST of the input.
     */
    export function parse(source: string): Node {
        const wsp = $(/\s*/);

        const val = $(wsp, /\[[^\]]*?\]/)
            .take(1)
            .slice(+1, -1);

        const tag = $(wsp, /\w+/, val.rep())
            .slice(1);

        const stp = $(wsp, ';', tag.rep())
            .take(2)
            .fold<string[]>(0, 1, (a, b) => (a || []).concat(b));

        const sgf = $(wsp, '(', stp.rep(), $('sgf', (s, i) => sgf.exec(s, i)).rep(), wsp, ')', wsp)
            .map(r => <Node>{ steps: r[2], vars: r[3] });

        return sgf.exec(source);
    }
}
