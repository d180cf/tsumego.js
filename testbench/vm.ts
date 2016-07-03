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
            const rb = <HTMLInputElement>document.querySelector('input[name="tool"]:checked');
            return rb && rb.value;
        },

        set tool(value: string) {
            const rbs = document.querySelectorAll('input[name="tool"]');

            for (const rb of rbs) {
                if (rb.getAttribute('value') == value)
                    rb.setAttribute('checked', '');
                else
                    rb.removeAttribute('checked');
            }
        },

        /** The color for which the problem needs to be solved: +1 or -1. */
        get solveFor(): number {
            const rb = <HTMLInputElement>document.querySelector('input[name="solve-for"]:checked');
            return { B: +1, W: -1 }[rb && rb.value] || 0;
        },

        /** Tells to invoke the solver in the step-by-step mode. */
        get debugSolver() {
            return !!document.querySelector('input[name="debug"]:checked');
        },

        /** The balance of ext ko treats. */
        get nkt() {
            const input = <HTMLInputElement>document.querySelector('input[name="nkt"]');
            return input && +input.value || 0;
        }
    };
}
