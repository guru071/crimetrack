const fs = require('fs');
let content = fs.readFileSync('src/OperationsRoom.jsx', 'utf8');

const oldLogic =           let isRecord = msg.type === 'record_share';
          let parsedRecord = null;
          
          if (isRecord) {
             try {
                parsedRecord = JSON.parse(msg.text);
             } catch(e) { isRecord = false; }
          };

const newLogic =           let isRecord = msg.type === 'record_share';
          let parsedRecord = null;
          
          try {
             const parsed = JSON.parse(msg.text);
             if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
                isRecord = true;
                parsedRecord = parsed;
             }
          } catch(e) { 
             if (isRecord) isRecord = false; 
          };

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/OperationsRoom.jsx', content, 'utf8');
console.log('Fixed record parser logic.');
