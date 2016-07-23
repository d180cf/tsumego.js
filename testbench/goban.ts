namespace testbench {
    import stone = tsumego.stone;
    import Board = tsumego.Board;

    class Marks {
        private tag: string;

        constructor(private svg: GobanElement, private def: string) {
            try {
                this.tag = /\bid="(\w+)"/.exec(def)[1];
            } catch (err) {
                throw SyntaxError('The shape def doesnt have an id="...": ' + def);
            }

            const defs = <HTMLElement>svg.querySelector('defs');

            defs.innerHTML += def;
        }

        private *nodes() {
            const refs = this.svg.querySelectorAll(`use`);

            for (let i = 0; i < refs.length; i++)
                if (refs[i].getAttribute('xlink:href') == '#' + this.tag)
                    yield refs[i];
        }

        get(x: number, y: number) {
            for (const ref of this.nodes())
                if (+ref.getAttribute('x') == x && +ref.getAttribute('y') == y)
                    return ref;

            return null;
        }

        add(x: number, y: number) {
            const ref = this.get(x, y);
            if (ref) return ref;
            this.svg.innerHTML += `<use x="${x}" y="${y}" xlink:href="#${this.tag}"/>`;
            this.svg.onupdated(x, y);
            return this.get(x, y);
        }

        remove(x: number, y: number) {
            const ref = this.get(x, y);
            if (!ref) return;
            this.svg.removeChild(ref);
            this.svg.onupdated(x, y);
        }

        clear() {
            for (const ref of this.nodes()) {
                const x = +ref.getAttribute('x');
                const y = +ref.getAttribute('y');

                this.svg.removeChild(ref);
                this.svg.onupdated(x, y);
            }
        }
    }

    export interface GobanElement extends HTMLElement {
        AB: Marks; // black stone
        AW: Marks; // white stone
        CR: Marks; // circle
        TR: Marks; // triangle
        SQ: Marks; // square
        MA: Marks; // cross
        SL: Marks; // selection

        onupdated(x: number, y: number): void;

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

    export module GobanElement {
        export function create(board: Board): GobanElement {
            const n = board.size;

            const div = document.createElement('div');

            div.innerHTML = `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 width="100%"
                 viewBox="-1.5 -1.5 ${n + 2} ${n + 2}">
              <style>
                * { stroke-width: 0.05 }
              </style>
              <defs>
                <pattern id="grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="black"></path>
                </pattern>
              </defs>

              <rect x="0" y="0" width="${n - 1}" height="${n - 1}" fill="url(#grid)" stroke="black" stroke-width="0.1"></rect>
            </svg>`;

            const svg = <GobanElement>div.querySelector('svg');

            Object.assign(svg, {
                AB: new Marks(svg, '<circle id="AB" r="0.475" fill="black" stroke="black"></circle>'),
                AW: new Marks(svg, '<circle id="AW" r="0.475" fill="white" stroke="black"></circle>'),
                CR: new Marks(svg, '<circle id="CR" r="0.25" fill="none"></circle>'),
                TR: new Marks(svg, '<path id="TR" d="M 0 -0.25 L -0.217 0.125 L 0.217 0.125 Z" fill="none"></path>'),
                MA: new Marks(svg, '<path id="MA" d="M -0.25 -0.25 L 0.25 0.25 M 0.25 -0.25 L -0.25 0.25" fill="none"></path>'),
                SQ: new Marks(svg, '<path id="SQ" d="M -0.25 -0.25 L 0.25 -0.25 L 0.25 0.25 L -0.25 0.25 Z" fill="none"></path>'),
                SL: new Marks(svg, '<rect id="SL" x="-0.5" y="-0.5" width="1" height="1" fill-opacity="0.5" stroke="none"></rect>'),

                // invoked after a marker has been added or removed
                onupdated(x: number, y: number) {
                    const color = svg.AB.get(x, y) ? 'white' : 'black';

                    for (const mark in svg) {
                        if (/^[A-Z]{2}$/.test(mark) && mark != 'AB' && mark != 'AW') {
                            try {
                                const item = (<Marks>svg[mark]).get(x, y);

                                if (item)
                                    item.setAttribute('stroke', color);
                            } catch (err) {
                                console.log(mark, x, y, err);
                            }
                        }
                    }
                }
            });

            for (let x = 0; x < n; x++) {
                for (let y = 0; y < n; y++) {
                    const c = board.get(x, y);

                    if (c > 0) svg.AB.add(x, y);
                    if (c < 0) svg.AW.add(x, y);
                }
            }

            // upper letters: A, B, C, ...
            for (let x = 0; x < n; x++) {
                const label = stone.cc.toString(stone(x, 0, 0), n)[0];
                svg.innerHTML += `<text x="${x}" y="-0.7" font-size="0.3" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
            }

            // left digits: 9, 8, 7, ...
            for (let y = 0; y < n; y++) {
                const label = stone.cc.toString(stone(0, y, 0), n)[1];
                svg.innerHTML += `<text x="${-0.7}" y="${y}" font-size="0.3" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
            }

            // lower labels: a, b, c, ...
            for (let x = 0; x < n; x++) {
                const label = stone.toString(stone(x, 0, 0))[1];
                svg.innerHTML += `<text x="${x}" y="${n - 1 + 0.7}" font-size="0.3" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
            }

            // right letters: a, b, c, ...
            for (let y = 0; y < n; y++) {
                const label = stone.toString(stone(0, y, 0))[2];
                svg.innerHTML += `<text x="${n - 1 + 0.7}" y="${y}" font-size="0.3" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
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

                return board.inBounds(nx, ny) && [nx, ny];
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