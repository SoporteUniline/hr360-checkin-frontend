#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const program=path.join(__dirname,'sync.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'uniline-sync-test-'));
const root=path.join(dir,'project'),source=path.join(dir,'source');
const put=(base,p,v)=>{const f=path.join(base,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,v);};
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const h=v=>crypto.createHash('sha256').update(v).digest('hex');
const run=()=>{const x=cp.spawnSync(process.execPath,[program,'--source',source,'--revision','fixture1'],{cwd:root,encoding:'utf8'});assert.equal(x.status,0,x.stderr);return JSON.parse(x.stdout)};
const check=(name,fn)=>{fn();console.log('PASS '+name)};
try{
 fs.mkdirSync(root,{recursive:true});
 put(source,'CLAUDE.md','nuevo');
 put(source,'.claude/core/principios.md','reglas');
 put(source,'.claude/skills/memoria-asociativa/SKILL.md','asociativa');
 put(source,'.claude/settings.json','{"hook":true}');
 put(source,'.claude/ejemplos/ejemplo.md','not copied');
 put(root,'CLAUDE.md','personalización');
 put(root,'app/a.js','app intacta');
 put(root,'supabase/a.sql','db intacta');
 put(root,'docs/decisiones.md','D-001');
 let z=run();
 check('agrega skills y scripts ausentes',()=>{assert.equal(z.added,3);assert.equal(get('.claude/skills/memoria-asociativa/SKILL.md'),'asociativa')});
 check('preserva instrucciones personalizadas',()=>{assert.equal(get('CLAUDE.md'),'personalización');assert(z.conflictFiles.includes('CLAUDE.md'))});
 check('no modifica app/supabase/docs ni ejemplos',()=>{assert.equal(get('app/a.js'),'app intacta');assert.equal(get('supabase/a.sql'),'db intacta');assert.equal(get('docs/decisiones.md'),'D-001');assert(!fs.existsSync(path.join(root,'.claude/ejemplos/ejemplo.md')))});
 check('segundo run no escribe repetidos',()=>{const q=run();assert.equal(q.added,0);assert.equal(q.updated,0)});
 put(source,'.claude/core/principios.md','reglas nuevas');
 check('actualiza archivo gestionado que no fue editado',()=>{const q=run();assert.equal(q.updated,1);assert.equal(get('.claude/core/principios.md'),'reglas nuevas')});
 put(root,'.claude/core/principios.md','ajuste local');
 put(source,'.claude/core/principios.md','otra versión');
 check('no pisa modificaciones locales',()=>{const q=run();assert(q.conflictFiles.includes('.claude/core/principios.md'));assert.equal(get('.claude/core/principios.md'),'ajuste local')});
 check('registro de hash anterior no es fuente de verdad',()=>{const s=JSON.parse(get('.uniline/sync-state.json'));assert.equal(s.files['.claude/core/principios.md'],h('reglas nuevas'));assert.notEqual(s.files['.claude/core/principios.md'],h('ajuste local'))});
 console.log('7 verificaciones funcionales del sincronizador; NO sustituyen pruebas de GitHub Actions con permisos reales');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
