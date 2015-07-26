To run the tests in node:

- `npm i` to install deps
- `tsc` to build the lib and the tests
- `node tests` to run them

To debug the tests in the browser:

- `tsc` to build the lib and the tests
- `cd ..; npm i; node server 80` to start the HTTP server
- `http://localhost/tests` to debug
