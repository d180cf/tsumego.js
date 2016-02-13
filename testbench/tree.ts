namespace testbench {
    interface Node {
        next: number[];
        data: any;
    }

    export class SearchTreeView {
        private nodes: { [hash: number]: Node } = {};
        private divs = new WeakMap<HTMLElement, { [hash: number]: HTMLElement }>();

        constructor(private container: HTMLElement) {

        }

        updateNode(path: number[], titles: string[], data) {
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

                if (!elem.textContent)
                    elem.textContent = '.';

                elem.childNodes[0].textContent = title + ' '
                    + JSON.stringify(node.data, null);

                tdiv = elem;
                prev = node;
            }
        }
    }
}
