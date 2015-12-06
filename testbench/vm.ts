module testbench {
    export const vm = {
        /** The currently selected editor tool: MA, AB, AW, etc. */
        get tool() {
            const rb = <HTMLInputElement>document.querySelector('input[name="tool"]:checked');
            return rb && rb.value;
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
