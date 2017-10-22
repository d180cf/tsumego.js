/* global jake:false */
/* global task:false */
/* global desc:false */
/* global complete:false */
/* global process:false */

var exec = (cmd, arg) => new Promise(resolve => {
    jake.exec(cmd, arg || {}, resolve);
});

var invoke = (task) => new Promise(resolve => {
    var t = jake.Task[task];
    t.addListener('complete', resolve);
    t.invoke();
});

function babel(args) {
    args = args || {};

    var fs = require('fs');
    var path = require('path');
    var babel = require('babel');

    var tsconfig = require(path.resolve('tsconfig.json'));

    var sourceMaps = args.sourceMaps === undefined ? true : !!args.sourceMaps;
    var srcPath = args.srcPath || tsconfig.compilerOptions.out;
    var outPath = args.outPath || srcPath;

    var es6src = fs.readFileSync(srcPath, 'utf8');
    var es6map = sourceMaps && fs.readFileSync(srcPath + '.map', 'utf8');

    var es5 = babel.transform(es6src, {
        inputSourceMap: sourceMaps && JSON.parse(es6map),
        sourceMaps: sourceMaps,
        loose: args.loose === false ? undefined : 'all',
        compact: false,
        blacklist: args.blacklist || [
            'regenerator',
            //'es6.forOf',
            //'es6.classes',
            //'es6.blockScoping',
            //'es6.templateLiterals',
        ]
    });

    es5.code = es5.code.replace(
        /(\r?\n\/\/# sourceMappingURL=)(.+)$/img,
        sourceMaps ? '$1' + outPath + '.map' : '$1(removed; see jakefile.js)');

    fs.writeFileSync(outPath, es5.code, 'utf8');
    sourceMaps && fs.writeFileSync(outPath + '.map', JSON.stringify(es5.map, null, '\t'), 'utf8');
}

desc('Builds the tsumego.js library.');
task('lib', { async: true }, () => {
    console.log('building tsumego.js...');
    exec('node ./node_modules/typescript/lib/tsc', { printStdout: true }).then(() => {
        babel({
            sourceMaps: false, // babel 5.8.23 screws source maps
            outPath: 'tsumego.es5.js',
            blacklist: []
        });

        babel({
            sourceMaps: false, // babel 5.8.23 screws source maps
            outPath: 'tsumego.es6.js'
        });
    }).then(complete);
});

desc('Runs unit tests.');
task('test', ['lib'], { async: true }, filter => {
    console.log('building tests.js...');
    process.chdir('tests');

    exec('node ../node_modules/typescript/lib/tsc', { printStdout: true }).then(() => {
        return babel();
    }).then(() => {
        console.log('npm install...');
        return exec('npm i');
    }).then(() => {
        if (/^debug:/.test(filter)) {
            console.log('debugging tests...');
            return exec('node-debug tests.js ' + filter.slice(6), { printStdout: true });
        } else {
            console.log('running tests...');
            return exec('node tests.js ' + (filter || ''), { printStdout: true });
        }
    }).then(() => {
        if (!filter)
            return exec('node tests mode:es5', { printStdout: true });
    }).then(() => {
        process.chdir('..');
    }).then(complete);
});

desc('Builds the testbench app.');
task('tb', ['lib'], { async: true }, mode => {
    console.log('building the testbench app...');
    process.chdir('app');

    exec('node ../node_modules/typescript/lib/tsc', { printStdout: true }).then(() => {
        if (mode == 'dev') {
            // TODO: babel screws source maps
            console.log('skipping babel in the dev mode...');
        } else {
            return babel({
                loose: false,
                blacklist: [
                    //'regenerator', // doesn't work in IE/Edge
                    //'es6.forOf', // doesn't work in IE/Edge
                    //'es6.blockScoping', // otheriwse const/let variables won't be bound in loops with callbacks
                ]
            });
        }
    }).then(() => {
        console.log('rebuilding problems/manifest.json...');
        process.chdir('../node_modules/problems');
        return exec('npm i');
    }).then(() => {
        return exec('node sgf > manifest.json');
    }).then(() => {
        process.chdir('../..');
    }).then(complete);
});

desc('Builds the console app.');
task('tgs', { async: true }, () => {
    console.log('building the console app...');
    process.chdir('console');

    exec('node ../node_modules/typescript/lib/tsc', { printStdout: true }).then(() => {
        return babel();
    }).then(() => {
        process.chdir('..');
    }).then(complete);
});

desc('Prepares a release package.');
task('release', ['lib'], () => {
    console.log('prepairing a release package...');
    jake.rmRf('bin/release');
    jake.mkdirP('bin');
    jake.cpR('release', 'bin');
    jake.cpR('libs/regenerator-runtime.js', 'bin/release/regenerator-runtime.js');

    var copy = path => jake.cpR(path, 'bin/release/' + path);

    copy('tsumego.es5.js');
    copy('tsumego.es6.js');
    copy('tsumego.d.ts');
});

desc('Builds the site contents.');
task('site', ['tb'], () => {
    console.log('building the site...');
    jake.rmRf('bin/site');
    jake.mkdirP('bin');
    jake.mkdirP('bin/site');
    jake.cpR('libs', 'bin/site/libs');
    jake.cpR('node_modules/problems', 'bin/site/problems');
    jake.rmRf('bin/site/problems/node_modules');

    jake.cpR('tsumego.js', 'bin/site');
    jake.cpR('tsumego.es5.js', 'bin/site');
    jake.cpR('tsumego.es6.js', 'bin/site');

    jake.cpR('app/app.js', 'bin/site');
    jake.cpR('app/index.html', 'bin/site');
    jake.cpR('app/favicon.ico', 'bin/site');
    jake.cpR('app/styles', 'bin/site/styles');
});

desc('Builds everything and runs the tests.');
task('default', { async: true }, () => {
    invoke('tb').then(() => {
        return invoke('tgs');
    }).then(() => {
        return invoke('lib');
    }).then(() => {
        return invoke('release');
    }).then(() => {
        return invoke('site');
    }).then(() => {
        return invoke('test');
    }).then(complete);
});
