[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

https://d180cf.github.io

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to about 10) and the target to capture are set manually. The plan is to implement the [lambda](http://www.t-t.dk/publications/lambda_lncs.pdf) [df-pn](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

Here is an example of a [problem](http://www.goproblems.com/9210) that this solver can handle in a minute. It can discover that if white has 2 ko treats elsewhere on the board, black can still capture the group by playing at the marked intersection:

<img src="https://rawgit.com/d180cf/tsumego.js/svg/docs/pics/9210.sgf.svg#3434563" height="200pt" />

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about) is good at fully enclosed tsumegos.
- Martin Muller's [Tsumego Explorer](http://webdocs.cs.ualberta.ca/~mmueller/ps/aaai05-tsumego.pdf) is probably the fastest solver for enclosed tsumegos.
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html) solves full boards up to 5x5.
- Thomas Thompsen's [MadLab](http://www.t-t.dk/madlab/) can solve open tsumegos.

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
