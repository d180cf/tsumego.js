namespace testbench {
    import stone = tsumego.stone;
    import SGF = tsumego.SGF;

    class Marks {
        private tag: string; // can be null; the "id" attribute for <use xlink:href="#ID">

        constructor(private svg: SVGGobanElement, private update: (x: number, y: number) => void, private def: string) {
            try {
                this.tag = /\bid="(\w+)"/.exec(def)[1];
                const defs = svg.querySelector('defs');

                // IE doesn't support innerHTML for SVG elements, hence this hack
                const g = <HTMLElement>document.createElementNS(this.svg.getAttribute('xmlns'), 'g');
                g.innerHTML = def;
                const m = <HTMLElement>g.firstChild;
                g.removeChild(m);
                defs.appendChild(m);
            } catch (_) {
                // the svg element cannot be referred to with <use>
            }
        }

        private *nodes() {
            if (this.tag) {
                const refs = $(this.svg).find(`use`).toArray();

                for (let i = 0; i < refs.length; i++)
                    if (refs[i].getAttribute('xlink:href') == '#' + this.tag)
                        yield refs[i];
            } else {
                const type = /^<(\w+) /.exec(this.def)[1];
                const refs = $(this.svg).find(type).toArray();

                yield* refs;
            }
        }

        get(x: number, y: number): HTMLElement {
            for (const ref of this.nodes())
                if (+ref.getAttribute('x') == x && +ref.getAttribute('y') == y)
                    return ref;

            return null;
        }

        add(x: number, y: number, value?: string): HTMLElement {
            const ref = this.get(x, y);
            if (ref) return ref;

            const g = <HTMLElement>document.createElementNS(this.svg.getAttribute('xmlns'), 'g');

            g.innerHTML = this.tag ?
                `<use x="${x}" y="${y}" xlink:href="#${this.tag}"/>` :
                this.def.replace(/\bx=""/, 'x="' + x + '"').replace(/\by=""/, 'y="' + y + '"').replace('></', '>' + value + '</');

            const m = <HTMLElement>g.firstChild;

            g.removeChild(m);
            this.svg.appendChild(m);

            this.update(x, y);
            return m;
        }

        remove(x: number, y: number) {
            const ref = this.get(x, y);
            if (!ref) return;
            this.svg.removeChild(ref);
            this.update(x, y);
        }

        flip(x: number, y: number) {
            if (this.get(x, y))
                this.remove(x, y);
            else
                this.add(x, y);
        }

        clear() {
            for (const ref of this.nodes()) {
                const x = +ref.getAttribute('x');
                const y = +ref.getAttribute('y');

                this.svg.removeChild(ref);
                this.update(x, y);
            }
        }
    }

    export interface SVGGobanElement extends HTMLElement {
        AB: Marks; // black stone
        AW: Marks; // white stone
        CR: Marks; // circle
        TR: Marks; // triangle
        SQ: Marks; // square
        MA: Marks; // cross
        SL: Marks; // selection
        LB: Marks; // text label

        addEventListener(type: "click", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mousedown", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mousemove", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mouseup", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
    }

    export interface GobanMouseEvent extends MouseEvent {
        /** 0-based column index, counted from the left side */
        cellX: number;

        /** 0-based row index, counted from the top side */
        cellY: number;
    }

    export module SVGGobanElement {
        export function create(sgf: string): SVGGobanElement {
            const root = SGF.parse(sgf).steps[0];
            const n = +root['SZ'][0];
            const div = document.createElement('div');

            div.innerHTML = `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 width="100%"
                 viewBox="-1.5 -1.5 ${n + 2} ${n + 2}">
              <defs>
                <pattern id="svg-goban-grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="black" stroke-width="0.05"></path>
                </pattern>
              </defs>

              <rect x="0" y="0" width="${n - 1}" height="${n - 1}" fill="url(#svg-goban-grid)" stroke="black" stroke-width="0.1"></rect>
            </svg>`;

            const svg: SVGGobanElement = div.querySelector('svg') as any;

            div.removeChild(svg);

            Object.assign(svg, {
                AB: new Marks(svg, update, '<circle id="AB" r="0.475" fill="black" stroke="black" stroke-width="0.05"></circle>'),
                AW: new Marks(svg, update, '<circle id="AW" r="0.475" fill="white" stroke="black" stroke-width="0.05"></circle>'),
                CR: new Marks(svg, update, '<circle id="CR" r="0.5" stroke="none" transform="scale(0.4)"></circle>'),
                TR: new Marks(svg, update, '<path id="TR" d="M 0 -0.5 L -0.433 0.25 L 0.433 0.25 Z" stroke="none" transform="scale(0.5)"></path>'),
                MA: new Marks(svg, update, '<path id="MA" d="M -0.2 -0.2 L 0.2 0.2 M 0.2 -0.2 L -0.2 0.2" stroke-width="0.05"></path>'),
                SQ: new Marks(svg, update, '<rect id="SQ" x="-0.5" y="-0.5" width="1" height="1" stroke="none" transform="scale(0.4)"></rect>'),
                SL: new Marks(svg, update, '<rect id="SL" x="-0.5" y="-0.5" width="1" height="1" fill-opacity="0.5" stroke="none"></rect>'),
                LB: new Marks(svg, update, `<text x="" y="" font-size="0.3" text-anchor="middle" dominant-baseline="middle" stroke-width="0"></text>`),
            });

            // invoked after a marker has been added or removed
            function update(x: number, y: number) {
                const color = svg.AB.get(x, y) ? 'white' : 'black';

                for (const mark in svg) {
                    if (/^[A-Z]{2}$/.test(mark) && !/AB|AW|SL/.test(mark)) {
                        try {
                            const item = (<Marks>svg[mark]).get(x, y);

                            if (item) {
                                item.setAttribute('stroke', color);
                                item.setAttribute('fill', color);
                            }
                        } catch (err) {
                            console.log(mark, x, y, err);
                        }
                    }
                }
            }

            for (const mark in root) {
                const marks: Marks = svg[mark];

                if (!marks)
                    continue;

                for (const text of root[mark]) {
                    const s = stone.fromString(text.slice(0, 2));
                    const m = marks.add(stone.x(s), stone.y(s));

                    if (/:/.test(text))
                        m.textContent = /:(.+)$/.exec(text)[1];
                }
            }

            // upper letters: A, B, C, ...
            for (let x = 0; x < n; x++) {
                const label = stone.cc.toString(stone.make(x, 0, 0), n)[0];
                svg.LB.add(x, -0.7, label);
            }

            // left digits: 9, 8, 7, ...
            for (let y = 0; y < n; y++) {
                const label = stone.cc.toString(stone.make(0, y, 0), n).slice(1);
                svg.LB.add(-0.7, y, label);
            }

            // lower labels: a, b, c, ...
            for (let x = 0; x < n; x++) {
                const label = stone.toString(stone.make(x, 0, 0))[1];
                svg.LB.add(x, n - 1 + 0.7, label);
            }

            // right letters: a, b, c, ...
            for (let y = 0; y < n; y++) {
                const label = stone.toString(stone.make(0, y, 0))[2];
                svg.LB.add(n - 1 + 0.7, y, label);
            }

            function getStoneCoords(event: MouseEvent) {
                // Chrome had a bug which made offsetX/offsetY coords wrong
                // this workaround computes the offset using client coords
                const r = svg.getBoundingClientRect();

                const offsetX = event.clientX - r.left;
                const offsetY = event.clientY - r.top;

                const x = offsetX / r.width;
                const y = offsetY / r.height;

                const nx = Math.round(x * (n + 2) - 1.5);
                const ny = Math.round(y * (n + 2) - 1.5);

                return nx >= 0 && nx < n && ny >= 0 && ny < n && [nx, ny];
            }

            function attachCellCoords(event: GobanMouseEvent) {
                const coords = getStoneCoords(event);

                if (coords)
                    [event.cellX, event.cellY] = coords;
            }

            svg.addEventListener('click', attachCellCoords);
            svg.addEventListener('mousedown', attachCellCoords);
            svg.addEventListener('mousemove', attachCellCoords);
            svg.addEventListener('mouseup', attachCellCoords);

            return svg;
        }
    }
}