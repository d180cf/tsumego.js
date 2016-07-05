/// <reference path="jquery.d.ts" />

module testbench {
    /** 
     * The sidepane on the left with the list of tsumegos.
     * It uses a .ui.accordion to group tsumegos by folder.
     */
    export class Directory {
        constructor(private container: HTMLElement) {
            $(container).click(event => {
                const target = $(event.target);

                if (target.is('.title')) {
                    target.siblings().removeClass('active');
                    target.addClass('active').next('.content').addClass('active');
                }
            });
        }

        /**
         * Finds or creates the .ui.content element.
         */
        private getFolder(folder: string): Element {
            for (const x of this.container.querySelectorAll('.title'))
                if (x.textContent == folder)
                    return <HTMLElement>x.nextSibling;

            if (!folder)
                return $(this.container).find('.content:first')[0];

            this.container.innerHTML += `<div class="title">${folder}</div><div class="content"><div class="ui inverted selection list"></div></div>`;

            return $(this.container).find('.content:last')[0];
        }

        find(path: string): HTMLElement {
            for (const e of this.container.querySelectorAll('a.item')) {
                const a = <HTMLAnchorElement>e;

                if (a.hash == '#' + path)
                    return a;
            }
        }

        /**
         * Returns an existing entry if it already exists.
         */
        add(path: string) {
            if (this.find(path))
                return;

            const folder = path.indexOf('/') < 0 ? null : path.split('/')[0];
            const name = folder ? path.slice(folder.length + 1) : path;
            const content = this.getFolder(folder);
            const list = <HTMLElement>content.querySelector('.ui.list');

            list.innerHTML += `<a class="item" href="#${path}">${name}</a>`;
        }

        /**
         * Does nothing if the entry doesn't exist.
         */
        remove(path: string) {
            const a = this.find(path);
            a && a.parentNode.removeChild(a);
        }

        /**
         * Makes this item active. Expands folders as necessary.
         */
        select(path: string) {
            $(this.container).find('.active').removeClass('active');

            for (const e of this.container.querySelectorAll('.directory .item')) {
                const a = <HTMLAnchorElement>e;

                if (a.hash == '#' + path) {
                    a.classList.add('active');
                    const content = a.parentElement.parentElement;
                    content.classList.add('active');
                    const title = content.previousElementSibling;
                    title.classList.add('active');
                } else {
                    a.classList.remove('active');
                }
            }
        }
    }
}

