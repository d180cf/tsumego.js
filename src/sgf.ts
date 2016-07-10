/// <reference path="llrdp.ts" />

/**
 * SGF parser.
 *
 * www.red-bean.com/sgf
 */
module tsumego.SGF {
    const {txt, rgx, seq} = LL;
    import Pattern = LL.Pattern;

    /**
     * EBNF rules:
     *
     *      val     = "[" ... "]"
     *      tag     = 1*("A".."Z") 0*val
     *      step    = ";" 0*tag
     *      sgf     = "(" 0*stp 0*sgf ")"
     */
    const pattern = (() => {
        var val = rgx(/\s*\[[^\]]*?\]/).map(s => s.trim().slice(+1, -1));
        var tag = seq(rgx(/\s*\w+/).map(s => s.trim()), val.rep());
        var step = seq(rgx(/\s*;/), tag.rep()).take(1).fold<string[]>(0, 1, (a, b) => (a || []).concat(b));
        var sgf_fwd: Pattern<Node> = new Pattern((s, i) => sgf.exec(s, i));
        var sgf = seq(rgx(/\s*\(\s*/), step.rep(), sgf_fwd.rep(), rgx(/\s*\)\s*/)).map(r => new Node(r[1], r[2]));

        return sgf;
    })();

    export interface Step {
        // e.g. ;AB[ac][ef] becomes steps[0]["AB"] = ["ac", "ef"]
        [tag: string]: string[];
    }

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

    export const parse = (source: string) => pattern.exec(source);
}
