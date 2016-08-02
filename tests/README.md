In the project root dir to run all the tests:

```
jake test
```

This runs the tests first against the es6 build, then against the es5 build. To run the tests against the es6 buidl only:

```
jake test[mode:es6]
```

Use brackets to filter tests by name:

```
jake test[tsumego]
```

This runs the selected tests against thes es6 build only.

The name of each test is prepended with its md5 hash that can also be used for filtering:

```
jake test[d35258]
```

`node-debug` can be used to debug tests:

```
...> npm i -g node-debug
...> jake test[123]
...> cd tests
...> ls
README.md        es6aiter.ts  node_modules  stats.ts
all.ts           index.html   obj           tests.js
ascii-board.ts   infra.ts     package.json  tests.js.map
console.tree.ts  logs.json    src           tsconfig.json
...> node-debug tests cfc72c
   info  - socket.io started
```

There is a `debugger` statement before each test, so it's safe to let it run, load all the js files and stop at that breakpoint.

> If you see a "connection refused" error in the launched Chrome, then it's likely because `tests.js` was built in a wrong way and `node-debug` doesn't like some of its syntax. Note the `jake` command: it builds `tests.js` properly. 

The same can be done with `jake test[debug:d35258]`