// GitHub Pages is configured for this branch's repository root. Keep source
// HTML in web/ and publish only Vite's compiled static files at the root.
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
execFileSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_APP_BASE:'/ai-image-editor-/',VITE_GITHUB_PAGES:'true'}});
const root=process.cwd();
const previous=existsSync('.pages-files.json')?JSON.parse(readFileSync('.pages-files.json','utf8')):[];
// Remove only previously generated assets, never source or repository metadata.
for(const file of previous){if(typeof file==='string'&&file.startsWith('assets/')&&!file.includes('..'))rmSync(path.join(root,file),{force:true});}
const files=[];
function copyTree(dir,relative=''){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const next=path.posix.join(relative,entry.name);
  if(entry.isDirectory())copyTree(path.join(dir,entry.name),next);
  else{cpSync(path.join(dir,entry.name),path.join(root,next),{recursive:true});files.push(next);}
 }
}
copyTree(path.join(root,'dist'));
writeFileSync('.nojekyll','');
writeFileSync('.pages-files.json',JSON.stringify(files,null,2)+'\n');
console.log('Compiled Pages files are ready at the repository root. Commit and push them to the configured Pages source branch.');
