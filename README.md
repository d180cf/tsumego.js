[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which the target is surrounded by a wall with no holes and the area being surrounded is up to 20 intersections. Some of these basic problems are rated as 9 dan on goproblems, though. The plan is to implement the [lambda](http://www.t-t.dk/publications/lambda_lncs.pdf) [df-pn](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

# Examples

Here are a few problems that this solver can handle in a few seconds:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/15197.svg" height="200pt" title="goproblems.com/15197" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/13083.svg" height="200pt" title="goproblems.com/13083" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/21185.svg" height="200pt" title="goproblems.com/21185" />

# API

To get this solution first take a [release](https://github.com/d180cf/tsumego.js/releases) of the solver and then invoke `tsumego.solve`:

```ts
var sgf4 = '(;FF[4]'
    // board size
    + 'SZ[9]'
    // black stones
    + 'AB[ae][be][ce][de][ee][ef][cg][eg][fg][fh][gh][hh][ai][ei][hi]'
    // white stones
    + 'AW[dg][ah][bh][ch][eh][di]'
    // what needs to be saved
    + 'MA[ch]'
    // white plays first
    + 'PL[W])';

var move = tsumego.solve(sgf4); // "W[bf]"
```

# Enclosing tsumegos

The group in question must be surrounded by a thick wall: even diagonal connections aren't allowed. The solver determines the set of available moves (aka the R-zone) by filling the area inside that thick wall. The R-zone problem is probably the hardest problem in tsumego solving algorithms, especially for open boundary tsumegos. A theoretical solution exists - the T. Thompsen's lamda search - but that solution is hard to adopt in a JS solver due to performance reasons.

Luckily, pretty much any enclosed tsumego can be easily converted to a tsumego with a thick wall:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/1.svg" height="200pt" title="goproblems.com/15283" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/2.svg" height="200pt" title="goproblems.com/15283" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/3.svg" height="200pt" title="goproblems.com/15283" />

First, spot the holes in the outer wall. TODO

# Notes

The solver uses internally es6 [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) which allows to suspend and resume the search at any moment. This is very useful when debugging the solver, as the process of solving can be rendered in the UI step by step, but this can also be useful to let the user stop the search if it runs for too long. In the es5 build generators are transpiled into state machines with [Babel](https://github.com/babel/babel).

The solver explores about 10k positions per second, despite it uses es6 generators and other advanced features. Solvers written in Java/C++ are [said](http://www.is.titech.ac.jp/~kishi//pdf_file/kishi_phd_thesis.pdf) to explore around 40k/s positions.

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about) is good at fully enclosed tsumegos.
- Martin Muller's [Tsumego Explorer](http://webdocs.cs.ualberta.ca/~mmueller/ps/aaai05-tsumego.pdf) is probably the fastest solver for enclosed tsumegos and uses a quite advanced version of depth first proof number search, as far as I know. It can handle tsumegos with up to 40 points according to published papers.  
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html) solves full boards up to 5x6.
- Thomas Thompsen's [MadLab](http://www.t-t.dk/madlab/) can solve open boundary tsumegos using the lambda proof number search. However it's not fast in enclosed ones.
- Xiao's [XuanXuanGo](http://www.xuanxuango.com/solver.htm) does a stellar job on enclosed tsumegos and can handle many open boundary ones. I don't know what algorithms it uses, though.

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
