import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const babel=require('next/dist/compiled/babel/core');
const source=await readFile(new URL('../src/components/OfflineExperience.jsx',import.meta.url),'utf8');
const {code}=babel.transformSync(source,{configFile:false,babelrc:false,presets:[require('next/dist/compiled/babel/preset-react')],plugins:[()=>({visitor:{ImportDeclaration(p){p.remove()},ExportDefaultDeclaration(p){p.replaceWith(p.node.declaration)}}})]});

test('online GPS review exposes discard without pretending synchronization can improve an old fix',async()=>{
  const event={id:'test',status:'review',method:'codigo',errorCode:'GPS_INACCURATE',captured_at:new Date().toISOString()};
  let cursor=0,discarded;
  const ctx={React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState(initial){const index=cursor++;return [index===1?[event]:initial,()=>{}]},useEffect(){},usePathname:()=>'/clock',useAuth:()=>({dataUser:null}),
    discardClockEvent:async value=>{discarded=value},
  };
  vm.createContext(ctx);vm.runInContext(code+'\nglobalThis.Component=OfflineExperience;',ctx);
  const nodes=[];
  function visit(node){if(Array.isArray(node))return node.forEach(visit);if(node&&typeof node==='object'){nodes.push(node);visit(node.children)}}
  visit(ctx.Component());
  const buttons=nodes.filter(n=>n.type==='button');
  const label=n=>n.children.flat(Infinity).filter(v=>typeof v==='string').join('');
  const discard=buttons.find(n=>label(n)==='Descartar captura');
  assert.ok(discard);assert.ok(!discard.props.disabled);
  assert.ok(!buttons.some(n=>label(n)==='Sincronizar ahora'||label(n)==='Reintentar validación'));
  discard.props.onClick();await new Promise(setImmediate);
  assert.equal(discarded.id,event.id);
});
