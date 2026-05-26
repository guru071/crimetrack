const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

const BAD_PATTERNS = [
  /visualViewport/g,
  /window\.innerHeight/g,
  /paddingBottom:\s*['"]?calc\(.*isKeyboardVisible.*\)/g,
  /paddingBottom.*isKeyboardVisible/g,
];

walk(directoryPath, function(err, results) {
  if (err) throw err;
  let fixedCount = 0;
  
  results.forEach(file => {
    if (!file.endsWith('.jsx') && !file.endsWith('.js') && !file.endsWith('.css')) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Auto-fix legacy padding overrides
    content = content.replace(/paddingBottom:\s*isKeyboardVisible\s*\?\s*["'][^"']*["']\s*:\s*["'][^"']*["']/g, '');
    content = content.replace(/style=\{\{\s*\.\.\.css\.page,\s*\}\}/g, 'style={css.page}');
    content = content.replace(/style=\{\{\s*paddingBottom:\s*isKeyboardVisible.*?\s*\}\}/g, '');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[FIXED] ${file}`);
      fixedCount++;
    }
  });
  
  console.log(`\nScan Complete. Total files audited: ${results.length}. Files fixed: ${fixedCount}.`);
});
