const fs = require('fs');
let content = fs.readFileSync('src/OperationsRoom.jsx', 'utf8');

// Fix input styles
content = content.replace(
  /color: "rgba\\(255,255,255,0.1\\)"/g, 
  'color: "var(--ct-text)"'
);
content = content.replace(
  /color: "rgba\\(255,255,255,0.03\\)"/g, 
  'color: "var(--ct-text)"'
);

// Ensure FileText and Send buttons don't have hardcoded #fff
content = content.replace(
  /color: "#fff"/g,
  'color: "var(--ct-text)"'
);

// Clean up any remaining \#fff
content = content.replace(/'#fff'/g, '"var(--ct-text)"');
content = content.replace(/"#fff"/g, '"var(--ct-text)"');

// Clean up \#1e293b (dark card bg)
content = content.replace(/'#1e293b'/g, '"var(--ct-card)"');
content = content.replace(/"#1e293b"/g, '"var(--ct-card)"');

// Fix text fields specifically
content = content.replace(
  /background: "rgba\\(255,255,255,0.03\\)"/g,
  'background: "var(--ct-card)"'
);
content = content.replace(
  /background: "rgba\\(255,255,255,0.05\\)"/g,
  'background: "var(--ct-card)"'
);
content = content.replace(
  /background: 'rgba\\(255,255,255,0.1\\)'/g,
  'background: "var(--ct-card)"'
);

fs.writeFileSync('src/OperationsRoom.jsx', content, 'utf8');
console.log('Cleanup applied.');
