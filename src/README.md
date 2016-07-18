# Transpositions

The transposition table is just a fancy name for the cache of solved positions. In a typical tsumego the solver creates about 200k TT entires and these are just unconditional results, i.e. those that don't depend on the sequence of moves that lead to them. Solved intermediate positions have to be cached because otherwise the search will become ~100x slower.

The TT is just a hash table where the key is the hash of the position (one position actually corresponds to 2 entires: when black plays first and when white plays first). In JS integer numbers are 32 bits, so these hashes are also 32 bit. This might seem good enough for typical tsumegos with 10-25 available points, but in fact these 32 bits are good enough only to encode about 16 points: a bitmask for black stones + a bitmask for white stones. This is why there are quite a few collisions that are not even addressed in the solver at the moment. In many cases the result extracted from TT is for a different position that has the same hash and despite that result is used, the solver still finds the correct move in maybe 99% of cases. This actually puzzles me. These collisions are the source of occasional failures in unit tests.    

# Repetitions

Many complications come from repetitions. In the simplest case it's a basic ko. More complicated cases may produce very long cycles. This position is known as the 10,000-year ko:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/10k-year-ko/1.svg#1" height="200pt" />

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/10k-year-ko/2.svg#1" height="200pt" />

These two positions correspond to 4 nodes in the search:

- `W1` when white is to play on the 1-st position
- `B1` when black is to play on the 1-st position
- `W2` when white is to play on the 2-nd position
- `B2` when black is to play on the 2-nd position

When there are no external ko treats and the search starts at `W1`, it sees that the two moves on the right don't work for white and it captures the black stone, doing `W1` → `B2`.

At `B2` it sees that black cannot play the two moves on the right and cannot recapture the stone either, as there are no ko treats, so black passes, doing `B2` → `W2`.

At `W2` it sees that if white plays either of the two moves on the right, black can recapture the stone and then capture white, as there are no ko treats. The search also finds that if white plays the move on the left, to stop the ko, it gets a dead shape. Thus white's only option is to pass: `W2` → `B2`.

At `B2` again the search sees that black can recapture the stone, since the white's pass before has reset the history of moves (a local pass means playing elsewhere): `B2` → `W1`.

At `W1` the search discovers that white cannot recapture the stone right now and has to pass: `W1` → `B1`.

At `B1` if black plays either of the two moves on the right (which would be the right thing to do if there were ko treats), white can recapture the stone and then capture black, so black has to pass: `B1` → `W1`.

At `W1` white can now recapture the stone, finishing the long loop: `W1` → `B2` → `W2` → `B2` → `W1` → `B1` → `W1`. At this point the search needs to admit that white lives if there are no external ko treats.

# Passing

The second most annoying problem is passing because it never appears when solving tsumegos manually, but appears pretty much always in the search.

## Passing once

In the simplest case when black passes, white has a chance to start the search from sctratch, without the need to look back at the history of moves. Normally, when considering the next move, there is a sequence of moves that leaded to the current  position and repeating any of the previous positions is not allowed unless the current player is the ko master. However when black passes locally, it can actually play a move elsewhere on the board: this changes the whole-board history of moves, but locally the position isn't affected. This is why when black passes, the local history of moves is reset and white might have more possible moves. In the search, once black passes, the solver adds a record to remind itself that here white started the search with no history and the ko master was black, for example. These records look like this:

```
    hash=1bcedf player=W km=B
    hash=b4c609 player=B km=B
    ...
```

Once the solver is about to add a new such record, it checks if the same record was already added before: this would mean that white already started the search in the same exact situation and now it's about to start it again. This is how the solver detects long loops, such as the one in the 10,000-year ko position.

## Passing twice

Passing one more time has an additional meaning. If black passed and then white passed too, black can in theory repeat these two passes as many times as needed. This can be useful if white is the ko master: every time black passes, it actually removes a ko treat elsewhere on the board, and once all ko treats are removed, black can play a move, now in assumption that neither side has ko treats.  

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/1-step-ko.svg#1" height="200pt" />

In this example if white is the ko master and it has just captured the black stone, black cannot recapture it back. However black can pass and then white will pass too. Now black can remove all ko treats and recapture the white stone because after passing the local history of moves is reset. However white won't be able to recapture the stone back because it doesn't have ko treats anymore, so black wins.

This won't be the case if white had infinitely many ko treats. This is the case when there is a double ko elsewhere on the board and black cannot remove that double ko:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/double-ko.svg#1" height="200pt" />

