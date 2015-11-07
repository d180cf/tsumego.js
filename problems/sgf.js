'use strict';

const fs = require('fs');
const glob = require('glob');

const manifest = {
    time: new Date().toJSON(),
    dirs: []
};

for (let dir of glob.sync('**/sgf.json')) {
    const info = JSON.parse(fs.readFileSync(dir, 'utf8'));
    info.problems = glob.sync(dir.replace('/sgf.json', '/**/*.sgf'));
    manifest.dirs.push(info);
}

console.log(JSON.stringify(manifest, null, 4));
