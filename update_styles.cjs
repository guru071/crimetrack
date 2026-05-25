const fs = require('fs');
let content = fs.readFileSync('src/OperationsRoom.jsx', 'utf8');

content = content.replace(/color: "#fff"/g, 'color: "var(--ct-text)"');
content = content.replace(/color: '#fff'/g, 'color: "var(--ct-text)"');
content = content.replace(/color="#fff"/g, 'color="var(--ct-text)"');
content = content.replace(/color: "#000"/g, 'color: "var(--ct-bg)"');

content = content.replace(/color: "#aaa"/g, 'color: "var(--ct-muted)"');
content = content.replace(/color: '#aaa'/g, 'color: "var(--ct-muted)"');
content = content.replace(/color: '#888'/g, 'color: "var(--ct-muted)"');
content = content.replace(/color: "rgba\\(255,255,255,0.3\\)"/g, 'color: "var(--ct-muted)"');

content = content.replace(/background: "rgba\\(255,255,255,0.05\\)"/g, 'background: "var(--ct-card)"');
content = content.replace(/background: 'rgba\\(255,255,255,0.05\\)'/g, 'background: "var(--ct-card)"');
content = content.replace(/background: "rgba\\(255,255,255,0.1\\)"/g, 'background: "color-mix(in srgb, var(--ct-text) 8%, transparent)"');
content = content.replace(/background: 'rgba\\(255,255,255,0.1\\)'/g, 'background: "color-mix(in srgb, var(--ct-text) 8%, transparent)"');
content = content.replace(/background: "rgba\\(255,255,255,0.03\\)"/g, 'background: "var(--ct-input-bg, color-mix(in srgb, var(--ct-text) 5%, transparent))"');

content = content.replace(/border: "1px solid rgba\\(255,255,255,0.1\\)"/g, 'border: "1px solid color-mix(in srgb, var(--ct-text) 12%, transparent)"');
content = content.replace(/border: "1px solid rgba\\(255,255,255,0.2\\)"/g, 'border: "1px solid color-mix(in srgb, var(--ct-text) 20%, transparent)"');

content = content.replace(/background: '#1e293b'/g, 'background: "var(--ct-card)"');
content = content.replace(/background: "#1e293b"/g, 'background: "var(--ct-card)"');

content = content.replace(/background: "rgba\\(0,0,0,0.5\\)"/g, 'background: "color-mix(in srgb, var(--ct-text) 8%, transparent)"');
content = content.replace(/background: 'rgba\\(0,0,0,0.5\\)'/g, 'background: "color-mix(in srgb, var(--ct-text) 8%, transparent)"');
content = content.replace(/background: 'rgba\\(0,0,0,0.3\\)'/g, 'background: "color-mix(in srgb, var(--ct-text) 5%, transparent)"');

content = content.replace(/background: 'rgba\\(0,0,0,0.95\\)'/g, 'background: "var(--ct-bg)", backdropFilter: "blur(10px)"');

content = content.replace(/background: "#333"/g, 'background: "color-mix(in srgb, var(--ct-text) 10%, transparent)"');
content = content.replace(/background: '#333'/g, 'background: "color-mix(in srgb, var(--ct-text) 10%, transparent)"');

fs.writeFileSync('src/OperationsRoom.jsx', content, 'utf8');
console.log('Styles updated.');
