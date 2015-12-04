/// <reference path="rdp.ts" />

/**
 * SGF parser.
 *
 * www.red-bean.com/sgf
 */
module tsumego.SGF {
    const {txt, rgx, seq, Pattern} = LL;

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
    export class Node {
        constructor(public steps: Step[], public vars: Node[]) { }

        get(tag: string) {
            return this.steps[0][tag];
        }
    }

    // decorators break the source-map-support tool
    Object.defineProperty(Node.prototype, 'get', {
        enumerable: false
    });

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
        const wsp = rgx(/\s*/);

        const val = seq(wsp, rgx(/\[[^\]]*?\]/))
            .take(1)
            .slice(+1, -1);

        const tag = seq(wsp, rgx(/\w+/), val.rep())
            .slice(1);

        const stp = seq(wsp, txt(';'), tag.rep())
            .take(2)
            .fold<string[]>(0, 1, (a, b) => (a || []).concat(b));

        const sgf = seq(wsp, txt('('), stp.rep(), new Pattern('sgf', (s, i) => sgf.exec(s, i)).rep(), wsp, txt(')'), wsp)
            .map(r => new Node(r[2], r[3]));

        return sgf.exec(source);
    }
}
