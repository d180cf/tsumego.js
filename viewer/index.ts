declare var tree;

function createTreeElement(node) {
    let [hash, color, result, x, y, ...nodes] = node;
    let div = document.createElement('div');

    div.setAttribute('board', hash);
    div.setAttribute('starts', color > 0 ? 'B' : 'W');

    if (result)
        div.setAttribute('winner', result > 0 ? 'B' : 'W');

    if (x !== null && y !== null)
        div.setAttribute('move', String.fromCharCode(65 + x) + (y + 1));

    for (let node of nodes)
        div.appendChild(createTreeElement(node));

    return div;
}

function expandNode(div: HTMLDivElement) {
    if (!div.querySelector(':scope > pre')) {
        let hash = div.getAttribute('board');
        let pre = document.createElement('pre');

        pre.innerHTML = hash
            .replace(/X/gmi, '<b></b>')
            .replace(/O/gmi, '<i></i>')
            .replace(/\./gmi, '<u></u>')
            .split('|')
            .join('<br/>');

        div.insertBefore(pre, div.firstChild);
    }

    let classes = div.getAttribute('class') || '';
    classes += 'expanded';
    div.setAttribute('class', classes);
}

function collapseNode(div: HTMLDivElement) {
    let pre = div.querySelector(':scope > pre');
    div.removeChild(pre);

    let classes = div.getAttribute('class') || '';
    classes = classes.replace(/\bexpanded\b/ig, '');
    div.setAttribute('class', classes);
}

window.addEventListener('load', () => {
    let container = document.createElement('div');
    container.setAttribute('class', 'tree');
    let root = createTreeElement(tree);
    container.appendChild(root);
    document.body.appendChild(container);
    expandNode(root);

    root.addEventListener('click', event => {
        let target = <HTMLDivElement>event.target;
        let hash = target.getAttribute('board');
        let expanded = /\bexpanded\b/i.test(target.getAttribute('class') || '');

        if (hash) {
            if (expanded)
                collapseNode(target);
            else
                expandNode(target);
        }
    });
});