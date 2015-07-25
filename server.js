var connect = require('connect');
var serveStatic = require('serve-static');
var port = +process.argv[2] || 8080;
connect().use(serveStatic(__dirname)).listen(port);
console.log('Listening on port', port);