const fs = require('fs');

['src/features/CommandCenter.jsx', 'src/features/UltimateEcosystemHub.jsx'].forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    if (c.startsWith('"') && c.endsWith('"')) {
      c = JSON.parse(c);
      fs.writeFileSync(f, c);
      console.log('Fixed ' + f);
    }
  } catch(e) {
    console.error(e);
  }
});
