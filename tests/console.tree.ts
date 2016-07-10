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

try {
    const treeify = require('treeify');
    console.tree = json => console.log(treeify.asTree(json, true));
} catch (err) {
    console.log('couldnt set console.tree');
}