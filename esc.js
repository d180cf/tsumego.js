var fs = require('fs');
var path = require('path');
var babel = require('babel');

var tsconfig = require(path.resolve('tsconfig.json'));

var srcPath = process.argv[2] || tsconfig.compilerOptions.out;
var outPath = process.argv[3] || srcPath;

var es6src = fs.readFileSync(srcPath, 'utf8');
var es6map = fs.readFileSync(srcPath + '.map', 'utf8');

var es5 = babel.transform(es6src, {
    inputSourceMap: JSON.parse(es6map),
    sourceMaps: true,
    loose: 'all',
    compact: false
});

es5.code = es5.code.replace(/(\r?\n\/\/# sourceMappingURL=)(.+)$/img, '$1' + outPath + '.map');

fs.writeFileSync(outPath, es5.code, 'utf8');
fs.writeFileSync(outPath + '.map', JSON.stringify(es5.map, null, '\t'), 'utf8');
