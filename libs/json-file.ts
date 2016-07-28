module jsonfile {
    export function* lines(path: string) {
        const fs = require('fs');
        const d = fs.openSync(path, 'r');

        try {
            let buffer = '', n = 0;
            const chunk = new Buffer(100);

            while (n = fs.readSync(d, chunk, 0, chunk.length)) {
                buffer += chunk.toString('utf8', 0, n);
                const lines = buffer.split(/\r?\n/);
                yield* lines.slice(0, -1);
                buffer = lines[lines.length - 1];
            }

            if (buffer)
                yield buffer;
        } finally {
            fs.closeSync(d);
        }
    }

    export function* items(path: string) {
        for (const line of lines(path)) {
            if (line == '[' || line == '{}]')
                continue;

            if (line[line.length - 1] != ',')
                throw SyntaxError('Missing trailing comma: ' + line);

            try {
                yield JSON.parse(line.slice(0, -1));
            } catch (_) {
                throw SyntaxError('Invalid JSON: ' + line);
            }
        }
    }
}
