/// <reference path="goban.ts" />

interface Document {
    registerElement(tagName: string);
}

namespace testbench {
    import stone = tsumego.stone;
    import Board = tsumego.Board;

    export interface GobanEditor {

    }

    export module GobanEditor {
        export function create(board: Board): GobanEditor {
            const goban = GobanElement.create(board);
            const container = document.createElement('table');

            container.classList.add('goban-editor');
            container.innerHTML = '<tr><td class="toolbox"><td class="goban">';

            const toolbox = container.querySelector('.toolbox');            

            container.querySelector('.goban').appendChild(goban);

            function addTool(tag: string) {
                const g = GobanElement.create(new Board(1));
                toolbox.appendChild(g);
                g[tag].add(0, 0);
                g.classList.add('tool');
                g.setAttribute('tool', tag);
                return g;
            }

            addTool('AB');
            addTool('AW');
            addTool('TR');
            addTool('MA');
            addTool('CR');
            addTool('SQ');

            return container;
        }
    }
}