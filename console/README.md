This is an interactive console solver: it implements a REPL interface for the tsumego library. Usage:

```
user@host> tsc
user@host> node tgs ../problems/goproblems.com/18629.sgf

   A B C D E F G H
 9 - - - - - - O X
 8 X O - - O O O X
 7 - X O O X X X X
 6 - X X X - - - -

Interactive mode:

    B A4   adds a block stone at A4
    W G6   adds a white stone at G6
    B      solve for black
    W      solve for white
    B+     solve for black + black has 1 ko treat
    B-2    solve for black + white has 2 ko treats
    W+     solve for white + black has 1 ko treat
    W-2    solve for white + white has 1 ko treat
    -      undo the last move
    -3     undo the last 3 moves
    pause  pause solving
    resume resume solving
    q      quit

:> o-1
rand seed: 0x39c5f78b
solving... look at the window title

:>
solved in 3 s
W wins with C9

   A B C D E F G H
 9 - - O - - - O X
 8 X O - - O O O X
 7 - X O O X X X X
 6 - X X X - - - -
```

Perhaps the main feature of the solver is that it can be paused and resumed at any moment. This is possible because the solver is implemented as a es6 generator.
