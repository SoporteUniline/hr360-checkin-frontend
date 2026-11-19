#!/usr/bin/env node
'use strict';
/**
 * Sincronización no destructiva de instrucciones Uniline.
 * Fuente: checkout de DiegoUniline/unilineagents/dist/proyecto.
 * NO aplica migraciones, NO toca app/, supabase/, docs/ ni hace merge/push.
 * Archivos locales personalizados se conservan y aparecen en el reporte.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const root=process.cwd();
const args=process.argv.slice(2);
const flag=(name)=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const sourceArg=flag('--source');
if(!sourceArg){console.error('Falta --source <ruta checkout/dist/proyecto>');process.exit(2)}
const source=path.resolve(root,sourceArg);
const stateFile=path.join(root,'.uniline','sync-state.json');
const reportFile=path.join(root,'.uniline','sync-report.md');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=p=>p==='CLAUDE.md'||p==='AGENTS.md'||p.startsWith('.claude/');
const exceptions=p=>p.startsWith('.claude/ejemplos/')||p.startsWith('.claude/private/');
function walk(dir,prefix=''){
 let all=[];
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=prefix?prefix+'/'+ent.name:ent.name;
   if(ent.isSymbolicLink())continue;
   if(ent.isDirectory())all.push(...walk(path.join(dir,ent.name),rel));
   else if(ent.isFile()&&allowed(rel)&&!exceptions(rel))all.push(rel);
 }
 return all;
}
if(!fs.existsSync(path.join(source,'CLAUDE.md'))||!fs.existsSync(path.join(source,'.claude','core','principios.md'))){
 console.error('La fuente no tiene el paquete Uniline esperado: '+source);process.exit(2);
}
let state={version:1,files:{}};
try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;}
if(state.version!==1||!state.files||typeof state.files!=='object'||Array.isArray(state.files))throw Error('Manifest inválido');
const found=walk(source),updates=[],initial=[],conflicts=[],kept=[],fixed=[];
for(const rel of found){
 const srcBuf=fs.readFileSync(path.join(source,rel)),digest=hash(srcBuf);
 const dst=path.join(root,rel);
 const old=state.files[rel];
 if(!fs.existsSync(dst)){
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.writeFileSync(dst,srcBuf);
    state.files[rel]=digest;
    initial.push(rel);
    continue;
 }
 const local=fs.readFileSync(dst);
 const currentHash=hash(local);
 if(currentHash===digest){state.files[rel]=digest;kept.push(rel);continue;}
 if(old&&old===currentHash){
   fs.writeFileSync(dst,srcBuf);state.files[rel]=digest;updates.push(rel);continue;
 }
 // Sin manifest previo o personalización local: NO sobrescribir.
 conflicts.push({file:rel,localSha256:currentHash,upstreamSha256:digest,knownPrevious:!!old});
}
const upsha=flag('--revision')||'main';
state.source='DiegoUniline/unilineagents';
state.lastCheckedRevision=upsha;
state.files=Object.fromEntries(Object.entries(state.files).sort(([a],[b])=>a.localeCompare(b)));
fs.mkdirSync(path.dirname(stateFile),{recursive:true});
const stateOutput=JSON.stringify(state,null,2)+'\n';
if(!fs.existsSync(stateFile)||fs.readFileSync(stateFile,'utf8')!==stateOutput)fs.writeFileSync(stateFile,stateOutput);
const report=[
 '# Revisión de actualización de Uniline Agents',
 '',
 'Esta es una propuesta en GitHub; no sustituye validaciones ni autoriza publicar.',
 '',
 '- Fuente: `DiegoUniline/unilineagents` revisión `'+upsha+'`',
 '- Archivos nuevos: '+initial.length,
 '- Archivos actualizados automáticamente (sin personalización): '+updates.length,
 '- Ya coincidentes: '+kept.length,
 '- Archivos diferentes preservados para revisión: '+conflicts.length,
 '',
 '## Archivos agregados',
 ...initial.map(x=>'- `'+x+'`'),
 '',
 '## Archivos actualizados',
 ...updates.map(x=>'- `'+x+'`'),
 '',
 '## Conflictos: NO sobrescritos',
 ...conflicts.map(x=>'- `'+x.file+'` — requiere comparación de cambios locales y upstream'),
 '',
 '### Regla de protección',
 'Un archivo solo se reemplaza cuando su contenido coincide con la última versión registrada en `.uniline/sync-state.json`. Si tiene ajustes propios o nunca fue registrado y difiere, se conserva. Nunca se toca `app/`, `supabase/`, `docs/`, `.github/` ni otra ruta fuera de AGENTS.md, CLAUDE.md y .claude/.',
 '',
 'Los conflictos son pendientes: la actualización NO es completa hasta revisar cada uno.',
 ''
].join('\n');
if(!fs.existsSync(reportFile)||fs.readFileSync(reportFile,'utf8')!==report)fs.writeFileSync(reportFile,report);
console.log(JSON.stringify({source:upsha,added:initial.length,updated:updates.length,unchanged:kept.length,conflicts:conflicts.length,conflictFiles:conflicts.map(x=>x.file)},null,2));
