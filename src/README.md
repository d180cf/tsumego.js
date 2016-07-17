Repetitions
===========

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