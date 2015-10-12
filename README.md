[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to about 10) and the target to capture are set manually. The plan is to implement the [lambda df-pn(r)](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

```
   A B C D E F G H
 9 - O - - - - X -
 8 X X O - - O O X
 7 - - X O O - O X
 6 - - X - O O X X
 5 - - - X X X - - 
```

It's an example of a [problem](http://www.goproblems.com/9210) that this solver can handle in a minute: it can discover that if white has 2 ko treats elsewhere on the board, black can still capture the group by playing at `E9`.

The current implementation manages to investigate 4-6k moves per second and is able to tell after half an hour that if in the following tsumego black plays first, white can still save the corner:

```
  A B C D E F G
7 - - - - O X -
6 - - - - O X -
5 - - - - O X -
4 - - - - O X -
3 O O O O X X -
2 X X X X X - -
1 - - - - - - -
```

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about)
- Martin Muller's Tsumego Explorer and [Fuego](https://github.com/svn2github/fuego) (the latter is actually a bot, not just a solver)
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html)

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
