const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.main = 'electron/main.cjs';
pkg.build = {
  appId: 'com.police.crimetrack',
  win: {
    target: 'nsis'
  },
  directories: {
    output: 'release'
  }
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('package.json updated for Electron builder.');
