module testbench {
    function hookToolToKey(tool: string, key: string) {
        document.addEventListener('keydown', event => {
            if (event.key.toUpperCase() == key.toUpperCase())
                vm.tool = tool;
        });

        document.addEventListener('keyup', event => {
            if (event.key.toUpperCase() == key.toUpperCase())
                vm.tool = '';
        });
    }

    hookToolToKey('MA', 'T'); // T = target
    hookToolToKey('AB', 'B'); // B = black
    hookToolToKey('AW', 'W'); // W = white

    export const vm = {
        /** The currently selected editor tool: MA, AB, AW, etc. */
        get tool(): string {
            const button = document.querySelector('#tool > button.active');
            return button && button.getAttribute('data-value');
        },

        set tool(value: string) {
            for (const button of document.querySelectorAll('#tool > button')) {
                if (button.getAttribute('data-value') == value)
                    button.classList.add('active');
                else
                    button.classList.remove('active');
            }
        },

        /** The color for which the problem needs to be solved: +1 or -1. */
        get solveFor(): number {
            const button = document.querySelector('#solve-for > button.active');
            return button ? +button.getAttribute('data-value') : 0;
        },

        /** Tells to invoke the solver in the step-by-step mode. */
        get debugSolver() {
            return /\bdebug=1\b/.test(location.search);
        },

        /** The balance of ext ko treats. */
        get nkt() {
            return +document.querySelector('#nkt > button.active').getAttribute('data-value');
        }
    };
}
