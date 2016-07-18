# Build

In the root project dir to build a deubggable version of the testbench:

```
jake tb[dev]
```

This build doesn't use Babel which screws source maps produced by TypeScript. However this version works only in Chrome, as it uses advanced ES6 features. To build a ES5 version run:

```
jake tb
``` 

# Debug

Usually in the URL there is just the problem id: `http://.../#basic/5`. To enter the debug mode add the `debug` parameter in the URL query: `?debug=B&km=W&rs=123#basic/7` (this one tells that black plays first, white is the ko master and the RNG should be initialized with `123` to make things reproducible). This should display this screen:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/debugger.png#1" height="200pt" />

The solver is a recursive function that implements a variation of deep-first search. That function is also a es6 generator - a feature that has appeared in JS just recently. Generators can be paused and resumed at arbitrary points and this is why this debugger can work: the search starts, suspends itself once the first move is made and the UI resumes the search when necessary.

A few buttons on the top right control that generator:

- it can be told to proceed to the next move and stop (aka F11 or "step into")
- it can be told to solve the current move and say the result (aka Shift-F11 or "step out")
- it can be told to solve the current move and display the next one (aka F10 or "step over")

The search simply does a `yield` after every move is made and after it's undone, so the UI can inspect the sequence of moves at all these points and make a decision wheteher to keep resuming the generator or let it stop.

This allows to stop the search at an interesting point and then start source level debugging.

Generators are quite successfully transpiled to es5 JS with Babel and the FB's Regenerator library, but unfortunately this screws source maps and source level debugging has to be done at the JS level, which looks nasty after all these `yield`s are transpiled to es5.

# Notes

Originally the only point of this app was to simplify debugging of the solver: it's a depth-first search that explores a huge tree (hundreds of thousands of nodes in some cases) with cycles (well, this is why this "tree" is actually a directed cyclic graph) and the length of the path being currently explored can get well over hundred nodes sometimes - keeping the state of such monstrous recursive function in the head didn't seem possible to me. This debugger helps to visualize where the search is at.

Then I brought in the Semantic UI library to make the UI more friendly and eventually it became good enough to be published on github.io as a standalone tsumego solver.
