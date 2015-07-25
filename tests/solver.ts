/// <reference path="infra.ts" />

module tests {
    function solve(g: Graph, c: number, k: number) {

    }

    /** 70204 means:
     *  - 2 b stones
     *  - 4 w stones
     *  - 7 is a tag */
    type Node = number;

    /** +1 - b wins
     *  -1 - w wins
     *   0 - the status isn't clear */
    type Status = number;

    class Graph {
        constructor(root: Node, make: (add: Graph.Builder) => void) {

        }
    }

    module Graph {
        export interface Builder {
            (node: Node, vars: Builder): void;
            (node: Node, status: Status): void;
        }
    }

    ut.group($ => {
        $.test($ => {
            const g = new Graph(10000, add => {
                add(20100, +1);
                add(20100, -1);
            });

            const r = solve(g, +1, 0);
        });
    });
}