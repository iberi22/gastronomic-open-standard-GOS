import fs from 'fs';
import path from 'path';

const filePath = 'e:/scripts-python/dishes/colombian/snacks/pandebono/images/1.png';

try {
    const buffer = fs.readFileSync(filePath);
    const prefix = buffer.toString('utf8', 0, 100);
    console.log('--- Buffer Preview ---');
    console.log(prefix);
    console.log('--- End Preview ---');

    const isLfs = prefix.startsWith('version https://git-lfs.github.com/spec/v1');
    console.log(`Is LFS? ${isLfs}`);

    console.log(`First char code: ${prefix.charCodeAt(0)}`);
    console.log(`Expected 'v' code: ${'v'.charCodeAt(0)}`);

} catch (e) {
    console.error(e);
}
