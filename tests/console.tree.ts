interface Console {
    /**
     * Prints nicely a tree-like json:
     *
     * ├─ apples: gala
     * └─ oranges: mandarin
     *
     */
    tree(json): void;
}

const treeify = require('treeify');
console.tree = json => console.log(treeify.asTree(json, true));
