// 6.1 Level loader + schema validation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const levelsDir = path.join(root, 'levels');
const schemaPath = path.join(root, 'LEVEL_SCHEMA.json');

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function main(){
  const schema = loadJSON(schemaPath);
  const ajv = new Ajv({ allErrors:true, strict:false });
  const validate = ajv.compile(schema);
  const files = fs.readdirSync(levelsDir).filter(f=>f.endsWith('.json') && f!=='index.json');
  let ok=0, fail=0;
  for (const f of files){
    const full = path.join(levelsDir,f);
    try {
      const data = loadJSON(full);
      const valid = validate(data);
      if (!valid){
        fail++; console.error(`[Level][FAIL] ${f}`); console.error(validate.errors);
      } else { ok++; console.log(`[Level][OK] ${f}`); }
    } catch(e){ fail++; console.error(`[Level][ERROR] ${f}`, e.message); }
  }
  console.log(`[Level] Summary ok=${ok} fail=${fail}`);
  if (fail>0) process.exitCode=1;
}

main();
