const fs = require('fs');

const packageRaw = fs.readFileSync('./package.json', 'utf8');
const packageJson = JSON.parse(packageRaw);

packageJson.main = './src/index.js';
packageJson.types = './src/index.d.ts';

delete packageJson.scripts;

fs.writeFileSync('./build/package.json', JSON.stringify(packageJson, null, 2));

if (fs.existsSync('./build/tsconfig.tsbuildinfo')) {
  fs.unlinkSync('./build/tsconfig.tsbuildinfo');
}

fs.copyFileSync('./CHANGELOG.md', './build/CHANGELOG.md');
fs.copyFileSync('./.npmignore', './build/.npmignore');
fs.copyFileSync('./README.md', './build/README.md');
fs.copyFileSync('./LICENSE', './build/LICENSE');
