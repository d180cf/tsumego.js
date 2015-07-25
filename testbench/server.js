var path = require('path');
var connect = require('connect');
var serveStatic = require('serve-static');
var port = +process.argv[2] || 8080;
var dir = path.join(__dirname, '..')
connect().use(serveStatic(dir)).listen(port);
console.log('Serving', dir, 'from port', port);
