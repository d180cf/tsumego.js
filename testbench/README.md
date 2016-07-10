In the root project dir to build a deubggable version of the testbench:

```
jake tb[dev]
```

This build doesn't use Babel which screws source maps produced by TypeScript. However this version works only in Chrome, as it uses advanced ES6 features. To build a ES5 version run:

```
jake tb
``` 
