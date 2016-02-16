namespace testbench {
    interface Node {
        next: number[];
        data: any;
    }

    function stringify(data) {
        const pairs: string[] = [];

        for (const key in data)
            pairs.push(key + '=' + data[key]);

        return pairs.join(' ');
    }

    function onSpanClick(event: MouseEvent) {
        if (event.ctrlKey)
            this.parentNode.classList.toggle('collapsed');
    }

    export class SearchTreeView {
        private nodes: { [hash: number]: Node } = {};
        private childs = new WeakMap<HTMLElement, { [hash: number]: HTMLElement }>();
        private current: HTMLElement[] = [];

        constructor(private container: HTMLElement) {

        }

        updateNode(path: number[], titles: string[], data?) {
            let hash: number;
            let node: Node;
            let title: string;
            let prev: Node;
            let tdiv = this.container;

            for (const x of this.current)
                x.classList.remove('in-path', 'current');

            this.current = [];

            for (let i = 0; i < path.length; i++) {
                hash = path[i];
                title = titles[i];
                node = this.nodes[hash];

                if (!node) {
                    node = { next: [], data: {} };
                    this.nodes[hash] = node;
                }

                if (prev && prev.next.indexOf(hash) < 0)
                    prev.next.push(hash);

                let divs = this.childs.get(tdiv);

                if (!divs)
                    this.childs.set(tdiv, divs = {});

                let elem = divs[hash];

                if (!elem) {
                    divs[hash] = elem = document.createElement('div');
                    tdiv.appendChild(elem);
                }

                if (!elem.firstChild || elem.firstChild.nodeName.toLowerCase() != 'span') {
                    const span = document.createElement('span');
                    elem.appendChild(span);
                    span.addEventListener('click', onSpanClick);
                }

                tdiv = elem;
                prev = node;

                tdiv.classList.add('in-path');
                this.current.push(tdiv);
            }

            tdiv.classList.add('current');
            tdiv.firstChild.textContent = title + ' ' + stringify(node.data);
            tdiv.title = (2 ** 32 + hash).toString(16).slice(-8);
            Object.assign(node.data, data);
        }
    }
}
