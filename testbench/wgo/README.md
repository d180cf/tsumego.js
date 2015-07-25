This is a copy of [WGo](https://github.com/waltheri/wgo.js) which is used as a debugger of the search algorithm:

1. The solver notifies the testbench as it steps thru the search tree.
2. The testbench tells WGo to make a move, pass or undo.
3. WGo renders the current state of the search in the UI.

This way of debugging the solver is possible because it is written in a non-recursive form.
