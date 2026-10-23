import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),dest=new URL('safari/extension/',root);
await mkdir(dest,{recursive:true});await cp(new URL('extension/',root),dest,{recursive:true});
const path=new URL('manifest.json',dest),m=JSON.parse(await readFile(path,'utf8'));
m.name='Afterglow for Safari';m.background={scripts:['background.js'],type:'module',persistent:false};
await writeFile(path,JSON.stringify(m,null,2)+'\n');
await writeFile(new URL('README.md',dest),'# Generated Safari source\n\nThis is prepared source, not an installable Safari app. See safari/README.md in the project for Xcode packaging steps and verification limits.\n');
console.log('Safari sources prepared. Packaging and live compatibility checks still require full Xcode.');
