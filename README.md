It's a simplistic tsumego solver in JS. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to ~10) and the target are set manually. The plan is to implement the [lambda df-pn(r)](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search and various static analysis algorithms.

```
  A B C D E F G H
1 - - - - - - O X
2 X O - - O O O X
3 - X O O X X X X
4 - X X X
```

It's an example of a [problem](http://www.goproblems.com/18629) that this solver can handle: it can figure out that if white plays first at C2, it lives without a ko.
