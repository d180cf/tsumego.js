/// <reference path="llrdp.ts" />

/**
 * SGF parser.
 *
 * www.red-bean.com/sgf
 */
module tsumego.SGF {
    const {txt, rgx, seq} = LL;
    import Pattern = LL.Pattern;

    const pattern = (() => {
        var val = rgx(/\s*\[[^\]]*?\]/).map(s => s.trim().slice(+1, -1));
        var tag = seq(rgx(/\s*\w+/).map(s => s.trim()), val.rep());
        var step = seq(rgx(/\s*;/), tag.rep()).take(1).fold<string[]>(0, 1, (a, b) => (a || []).concat(b));
        var sgf_fwd: Pattern<Node> = new Pattern((s, i) => sgf.exec(s, i));
        var sgf = seq(rgx(/\s*\(\s*/), step.rep(), sgf_fwd.rep(), rgx(/\s*\)\s*/)).map(r => new Node(r[1], r[2]));

        return sgf;
    })();

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
    export const parse = (source: string) => pattern.exec(source);
}
