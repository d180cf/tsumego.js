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

    export class SearchTreeView {
        private nodes: { [hash: number]: Node } = {};
        private divs = new WeakMap<HTMLElement, { [hash: number]: HTMLElement }>();
        private current: HTMLElement;

        constructor(private container: HTMLElement) {

        }

        updateNode(path: number[], titles: string[], data?) {
            let prev: Node;
            let tdiv = this.container;

            for (let i = 0; i < path.length; i++) {
                let hash = path[i];
                let title = titles[i];
                let node = this.nodes[hash];

                if (!node)
                    this.nodes[hash] = node = { next: [], data: {} };

                if (prev && prev.next.indexOf(hash) < 0)
                    prev.next.push(hash);

                if (i == path.length - 1)
                    Object.assign(node.data, data);

                let divs = this.divs.get(tdiv);

                if (!divs)
                    this.divs.set(tdiv, divs = {});

                let elem = divs[hash];

                if (!elem) {
                    divs[hash] = elem = document.createElement('div');
                    tdiv.appendChild(elem);
                }

                if (!elem.firstChild || elem.firstChild.nodeName.toLowerCase() != 'span') {
                    const span = document.createElement('span');
                    elem.appendChild(span);
                }

                if (i == path.length - 1)
                    elem.firstChild.textContent = title + ' ' + stringify(node.data);

                tdiv = elem;
                prev = node;
            }

            this.current && this.current.removeAttribute('class');
            this.current = tdiv;
            this.current.setAttribute('class', 'current');
        }
    }
}
