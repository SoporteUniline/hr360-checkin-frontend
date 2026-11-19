#!/usr/bin/env node
'use strict';
// Uniline Agents · Enrutador local de contexto. NO lee documentos completos,
// no infiere relaciones sin evidencia y no modifica archivos del proyecto.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=process.env.UNILINE_PROJECT_DIR||process.env.CLAUDE_PROJECT_DIR||process.cwd();
const manifest=path.join(root,'docs','contexto','relaciones.json');
const docs=path.join(root,'docs','modulos');
const args=process.argv.slice(2);
const flag=(key, fallback)=>{const i=args.indexOf(key);return i>=0?args[i+1]||fallback:fallback};
const cmd=args[0]||'help';
const json=args.includes('--json');
const slug=x=>typeof x==='string'&&/^[a-z0-9_-]{1,80}$/.test(x);
const safe=x=>typeof x==='string'&&x.length>0&&!path.isAbsolute(x)&&!x.split(/[\\/]/).includes('..')&&!x.includes('\0');
function loaded(){
 let raw;
 try{raw=JSON.parse(fs.readFileSync(manifest,'utf8'))}catch(e){
   if(e.code==='ENOENT')return {version:1,modules:[],missing:true,issues:['Sin índice: docs/contexto/relaciones.json no existe']};
   throw new Error('Índice inválido: '+e.message);
 }
 if(raw.version!==1||!Array.isArray(raw.modules))throw Error('Índice requiere version=1 y modules=[]');
 const issues=[],seen=new Set();
 const modules=raw.modules.map((m,i)=>{
   if(!slug(m.id)||seen.has(m.id))throw Error('Módulo inválido/duplicado en posición '+i);
   seen.add(m.id);
   if(!safe(m.doc))throw Error('Ruta documental no segura: '+m.id);
   if(!Array.isArray(m.links||[]))throw Error('Links inválidos: '+m.id);
   const links=(m.links||[]).map(l=>{
     if(!slug(l.to)||typeof l.evidence!=='string'||!l.evidence.trim())throw Error('Vínculo sin destino o evidencia: '+m.id);
     if(l.sourcePath&&!safe(l.sourcePath))throw Error('Fuente no segura en '+m.id);
     if(l.sourceSha256&&!/^[a-f0-9]{64}$/i.test(l.sourceSha256))issues.push('SHA inválido en '+m.id+' → '+l.to);
     return l;
   });
   return {...m,aliases:Array.isArray(m.aliases)?m.aliases.filter(slug):[],links};
 });
 for(const m of modules)for(const l of m.links)
   if(!seen.has(l.to))issues.push('Destino ausente: '+m.id+' → '+l.to);
 return {version:1,modules,missing:false,issues};
}
function status(link){
 if(!link.sourcePath||!link.sourceSha256)return 'SIN_HUELLA';
 const f=path.join(root,link.sourcePath);
 try{const sha=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');return sha===link.sourceSha256?'VIGENTE':'STALE';}
 catch{return 'FUENTE_NO_LOCALIZADA'}
}
function fallbackId(id){
 const name=id+'.md';
 return slug(id)&&fs.existsSync(path.join(docs,name))?{id,doc:'docs/modulos/'+name,aliases:[],links:[]}:null;
}
function route(id,risk){
 if(!slug(id))throw Error('Identificador de módulo inválido');
 const g=loaded(),nodes=g.modules;
 let main=nodes.find(m=>m.id===id||m.aliases.includes(id));
 let fallback=false;
 if(!main){main=fallbackId(id);fallback=!!main;}
 if(!main)return {ok:false,risk,reason:'Módulo no localizado; buscar por símbolos en código antes de concluir inexistencia',indexMissing:g.missing,availableIds:nodes.map(m=>m.id),warnings:g.issues};
 const depth=risk==='high'?2:risk==='low'?0:1;
 const map=new Map(nodes.map(m=>[m.id,m]));map.set(main.id,main);
 const visited=new Set([main.id]),queue=[{id:main.id,d:0}],links=[],paths=[];
 while(queue.length){
  const {id:current,d}=queue.shift(),n=map.get(current);
  if(!n)continue;
  paths.push({module:n.id,doc:n.doc,depth:d,exists:fs.existsSync(path.join(root,n.doc))});
  if(d>=depth)continue;
  const edges=[];
  for(const l of n.links)edges.push({from:current,to:l.to,edge:l,direction:'saliente'});
  for(const m of nodes)for(const l of m.links)
    if(l.to===current)edges.push({from:current,to:m.id,edge:l,direction:'entrante'});
  for(const e of edges){
   const s=status(e.edge);
   links.push({from:e.from,to:e.to,direction:e.direction,reason:e.edge.reason||'',evidence:e.edge.evidence,status:s,critical:!!e.edge.critical});
   if(!visited.has(e.to)&&map.has(e.to)){visited.add(e.to);queue.push({id:e.to,d:d+1});}
  }
 }
 const warnings=[...g.issues];
 if(g.missing||fallback)warnings.push('Sin relaciones verificadas para este módulo: NO inferir ausencia de impactos');
 if(!links.length&&depth>0)warnings.push('Sin enlaces declarados; buscar referencias en código, SQL, tests y D-XXX según riesgo');
 if(links.some(x=>x.status!=='VIGENTE'))warnings.push('Hay vínculos sin huella comprobada o con fuente obsoleta: contrastar código antes de confiar');
 if(risk==='high')warnings.push('Cambio crítico: revisar permisos, dinero, integridad, concurrencia, efectos inversos y dependencias NO documentadas');
 return {ok:true,module:main.id,risk,depth,paths,links,warnings,indexMissing:g.missing,automaticDependencyDiscovery:false};
}
function check(base){
 const g=loaded(),warnings=[...g.issues];let changed=[];
 try{changed=execFileSync('git',['diff','--name-only','--diff-filter=ACMR',base,'--'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);}
 catch(e){return {ok:false,reason:'No fue posible consultar git diff: '+e.message}}
 const changedSet=new Set(changed);
 for(const m of g.modules){
  const changedEvidence=m.links.filter(l=>l.sourcePath&&changedSet.has(l.sourcePath));
  const filesChanged=changed.filter(p=>p.startsWith('app/src/')||p.startsWith('src/')||p.startsWith('supabase/'));
  const maybe=filesChanged.filter(p=>p.toLowerCase().split(/[^a-z0-9]+/).includes(m.id.toLowerCase()));
  if((changedEvidence.length||maybe.length)&&!changedSet.has(m.doc))
   warnings.push('Revisar doc de '+m.id+': cambios potencialmente relacionados en '+[...changedEvidence.map(x=>x.sourcePath),...maybe].join(', '));
  for(const l of changedEvidence)warnings.push('Huella de relación para '+m.id+' → '+l.to+' requiere revalidación: '+l.sourcePath);
 }
 if((g.missing||g.modules.length===0)&&changed.some(p=>p.startsWith('app/src/')||p.startsWith('src/')||p.startsWith('supabase/')))
  warnings.push('Sin índice asociativo: cambios funcionales pueden no tener documentación de dependencias; revisar manualmente');
 return {ok:true,base,changedCount:changed.length,changed,warnings,
  claim:'Revisión heurística: ninguna advertencia NO significa que todas las dependencias están cubiertas'};
}
function print(out){
 if(json){console.log(JSON.stringify(out,null,2));return;}
 if(out.module)console.log('Módulo: '+out.module+' | Riesgo: '+out.risk+' | Profundidad: '+out.depth);
 for(const p of out.paths||[])console.log('LEER '+p.doc+' (salto '+p.depth+(p.exists?'':', NO ENCONTRADO')+')');
 for(const l of out.links||[])console.log('RELACIÓN '+l.from+' → '+l.to+' ['+l.direction+'/'+l.status+'] '+l.evidence);
 for(const w of out.warnings||[])console.log('ADVERTENCIA '+w);
 if(out.reason)console.log(out.reason);
 if(out.changed)console.log('Archivos cambiados: '+out.changedCount);
}
try{
 if(cmd==='route'){const risk=flag('--risk','normal');if(!['low','normal','high'].includes(risk))throw Error('Riesgo permitido: low, normal, high');print(route(args[1],risk));}
 else if(cmd==='check')print(check(flag('--base','HEAD~1')));
 else console.log('Uso: node .claude/scripts/contexto.cjs route <modulo> [--risk low|normal|high] [--json] | check --base <git-ref> [--json]');
}catch(e){console.error('ERROR: '+e.message);process.exitCode=1}
