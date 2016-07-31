/// <reference path="../libs/jquery.d.ts" />

module testbench {
    /** 
     * The sidepane on the left with the list of tsumegos.
     * It uses a .ui.accordion to group tsumegos by folder.
     */
    export class Directory {
        private input: JQuery;
        private container: JQuery;

        /** Fired when the close icon is clicked on an item. */
        public deleted = new Event<(path: string) => void>();

        constructor(container: string | Element | JQuery) {
            this.input = $(container).find('input');
            this.container = $(container).find('.menu');

            this.input.change(() => {
                this.filter = this.input.val();
            });

            this.filter = ss.filter;

            setTimeout(() => {
                // restore the scrolling offset after
                // the problems are loaded; that's a hack,
                // actually
                this.container.scrollTop(ss.dst)
            });

            this.container.click(event => {
                const target = $(event.target);

                if (target.is('.icon')) {
                    event.stopPropagation();
                    event.preventDefault(); // otherwise window#hashchange will be triggered

                    if (target.is('.close')) {
                        const a = target.parent();
                        a.addClass('deleted'); // to be actually deleted once page closed
                    }

                    if (target.is('.undo')) {
                        const a = target.parent();
                        a.removeClass('deleted');
                    }
                }
            });

            window.addEventListener('beforeunload', () => {
                ss.dst = this.container.scrollTop();

                this.container.find('.item.deleted').each((i, a) => {
                    const path = $(a).text();
                    this.deleted.fire(path);
                });
            });

            document.addEventListener('keydown', event => {
                const a = this.container.find('.item.active');

                if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
                    if (event.keyCode == 38)
                        location.hash = a.prevAll('.item:visible').first().attr('href') || location.hash;

                    if (event.keyCode == 40)
                        location.hash = a.nextAll('.item:visible').first().attr('href') || location.hash;
                }
            });
        }

        get filter() {
            return this.input.val();
        }

        set filter(value: string) {
            this.input.val(value);
            ss.filter = value;

            for (const e of this.container.find('a.item').toArray())
                this.toggle(e, value);
        }

        item(path: string) {
            const a = this.add(path);

            return new class DirectoryItem {
                set hard(value: boolean) {
                    $(a).toggleClass('hard', value);
                }
            }
        }

        private toggle(item, filter: string) {
            const path = $(item).text();

            const visible = path.indexOf(filter) >= 0
                // it would be odd if the current tsumego was hidden
                || path == location.hash.slice(1);

            $(item).toggle(visible);
        }

        find(path: string | ((path: string) => boolean)) {
            for (const e of this.container.find('a.item').toArray()) {
                const a = <HTMLAnchorElement>e;

                const matches = typeof path === 'string' ?
                    a.hash == '#' + path :
                    path(a.hash.slice(1));

                if (matches)
                    return a;
            }
        }

        /**
         * Returns an existing entry if it already exists.
         */
        add(path: string) {
            let a = this.find(path);

            if (!a) {
                const next = this.find(s => s > path);

                a = document.createElement('a');

                a.setAttribute('class', 'item');
                a.setAttribute('href', '#' + path);
                a.textContent = path;
                a.innerHTML += '<i class="icon close" title="Delete this tsumego"></i>';
                a.innerHTML += '<i class="icon undo" title="Restore this tsumego"></i>';
                a.innerHTML += '<i class="icon star" title="This is a hard tsumego"></i>';

                if (next)
                    $(a).insertBefore(next);
                else
                    this.container.append(a);

                this.toggle(a, this.filter);
            }

            return a;
        }

        /**
         * Does nothing if the entry doesn't exist.
         */
        remove(path: string) {
            $(this.find(path)).remove();
        }

        /**
         * Makes this item active. Expands folders as necessary.
         */
        select(path: string) {
            this.container.find('.active').removeClass('active');
            $(this.find(path)).addClass('active');
        }
    }
}

