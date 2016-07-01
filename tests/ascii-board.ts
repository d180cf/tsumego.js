module tests {
    export const enum AnsiEscapeCode {
        red = 0x5b,
        green = 0x5c,
        yellow = 0x5d,
        blue = 0x5e, // almost invisible on black background
        magenta = 0x5f,
        cyan = 0x60,
        white = 0x61,
        black = 0x1e,
        darkred = 0x1f,
        darkgreen = 0x20,
        darkyellow = 0x21,
        darkblue = 0x22, // almost invisible on black background
        darkmagenta = 0x23,
        darkcyan = 0x24,
    }

    export class CharBoard {
        chars: { [xy: number]: string } = {};
        style: { [xy: number]: AnsiEscapeCode } = {};
        width = 0;

        constructor(public size: number, private defchar = ' ') {

        }

        set(x: number, y: number, char: string, style?: AnsiEscapeCode) {
            this.chars[x | y << 4] = char;
            this.style[x | y << 4] = style;

            if (char.length > this.width)
                this.width = char.length;
        }

        toString() {
            const rows = [];

            for (let y = 0; y < this.size; y++) {
                const row = [];

                for (let x = 0; x < this.size; x++) {
                    const char = (this.defchar.repeat(this.width) + (this.chars[x | y << 4] || '')).slice(-this.width);
                    const style = this.style[x | y << 4];

                    row.push(style ? `\x1b[${style}m${char}\x1b[0m` : char);
                }

                rows.push(row.join(' '));
            }

            return rows.join('\n');
        }
    }

    export module CharBoard {
        // console.log(colors + '');
        export const colors = new CharBoard(16, '0');

        for (let i = 0; i < 256; i++)
            colors.set(i & 15, i >> 4, i.toString(16), i);
    }
}
