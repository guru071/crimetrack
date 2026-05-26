const fs = require('fs');
const readline = require('readline');

async function extractFiles() {
  const fileStream = fs.createReadStream('C:\\Users\\gurup\\.gemini\\antigravity\\brain\\dccfe12a-a12f-4855-ab14-6d6bcaaa41e8\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let ccContent = null;
  let uehContent = null;

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.tool_calls) {
        for (const call of entry.tool_calls) {
          if (call.name === 'write_to_file') {
            const target = call.args.TargetFile;
            if (target && target.includes('CommandCenter.jsx')) {
              ccContent = call.args.CodeContent;
            }
            if (target && target.includes('UltimateEcosystemHub.jsx')) {
              uehContent = call.args.CodeContent;
            }
          }
        }
      }
    } catch (e) {}
  }

  if (ccContent) {
    fs.writeFileSync('C:\\Users\\gurup\\police\\crimetrack-app\\src\\features\\CommandCenter.jsx', ccContent);
    console.log("Restored CommandCenter.jsx");
  } else {
    console.log("CommandCenter.jsx not found in transcript.");
  }
  
  if (uehContent) {
    fs.writeFileSync('C:\\Users\\gurup\\police\\crimetrack-app\\src\\features\\UltimateEcosystemHub.jsx', uehContent);
    console.log("Restored UltimateEcosystemHub.jsx");
  } else {
    console.log("UltimateEcosystemHub.jsx not found in transcript.");
  }
}

extractFiles();
