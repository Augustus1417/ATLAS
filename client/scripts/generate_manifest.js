const fs = require('fs')
const path = require('path')
const modelsDir = path.join(__dirname, '..', 'public', 'assets', 'models', 'updated')
const out = {}
if (!fs.existsSync(modelsDir)) {
  console.log('No updated models dir')
  process.exit(0)
}
const files = fs.readdirSync(modelsDir)
files.forEach(f=>{
  if (f.endsWith('.meta.json')){
    const content = JSON.parse(fs.readFileSync(path.join(modelsDir,f),'utf8'))
    out[content.name||f.replace('.meta.json','')] = content
  }
})
fs.writeFileSync(path.join(modelsDir,'manifest.json'), JSON.stringify(out,null,2))
console.log('Wrote manifest.json with', Object.keys(out).length, 'entries')
