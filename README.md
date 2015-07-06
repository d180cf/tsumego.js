It's a simplistic tsumego solver in JS based on ideas explained by Martin Muller in his numerous papers. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to ~10) and the target are set manually:

```
------OX
XO--OOOX
-XOOXXXX
-XXX
```

It's an example of a [problem](http://www.goproblems.com/18629) that this solver can handle: it can figure out that if O (white) plays first, it lives without a ko.

The library is written in [TypeScript](https://github.com/Microsoft/TypeScript). To compile it and test do the following in the project folder:

```
npm install -g typescript
tsc
node server
```

Then open http://localhost:8080/#18629.sgf and see the dev console. The testbench will load the given SGF and solve it:

```sgf
(;FF[4]SZ[9]MA[eb]

 AB[ha][ab][hb][bc][ec][fc][gc][hc][bd][cd][dd]
 AW[ga][bb][eb][fb][gb][cc][dc]
 DD[aa][ba][ca][da][ea][fa][ab][bb][cb][db][ac][cc][dc][ad])
 ```

 Note, that MA sets the target to capture and DD sets all possible moves that the solver will consider.
