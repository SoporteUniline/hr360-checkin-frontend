import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const presets = [require('next/dist/compiled/babel/preset-react')];

test('moving map marker preserves latest name/radius and circle updates', async () => {
  const source = await readFile(new URL('../src/components/MapaSelectorGoogle.jsx', import.meta.url), 'utf8');
  const {code} = babel.transformSync(source, {configFile:false,babelrc:false,presets,plugins:[() => ({visitor:{
    ImportDeclaration(p){p.remove()}, ExportDefaultDeclaration(p){p.replaceWith(p.node.declaration)},
  }})]});
  let cursor=0, effects=[], click, drag, current={nombre_area:'Original',radio_metros:100,latitud:19,longitud:-99}, circleOptions;
  const slots=[];
  const ctx={
    React:{createElement(){}},
    useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,value=>{slots[i].value=value}]},
    useRef(initial){return slots[cursor++]??={current:initial}},
    useEffect(run,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i][j])){effects.push(run);slots[i]=deps}},
    window:{google:{maps:{
      Map:class{addListener(name,fn){if(name==='click')click=fn}panTo(){}},
      Marker:class{addListener(name,fn){if(name==='dragend')drag=fn}setPosition(){}},
      Circle:class{setOptions(options){circleOptions=options}}, Animation:{DROP:1},
    }}},
  };
  vm.createContext(ctx);vm.runInContext(code+'\nglobalThis.Component=MapaSelectorGoogle;',ctx);
  const render=()=>{cursor=0;effects=[];const snapshot=current;ctx.Component({center:{lat:current.latitud,lng:current.longitud},radius:current.radio_metros,onClick:coords=>{current={...snapshot,latitud:coords.lat,longitud:coords.lng}}});effects.forEach(fn=>fn())};
  render();current={...current,nombre_area:'Nuevo',radio_metros:50};render();
  click({latLng:{lat:()=>20,lng:()=>-98}});
  assert.equal(current.nombre_area,'Nuevo');assert.equal(current.radio_metros,50);
  render();assert.equal(circleOptions.radius,50);assert.equal(circleOptions.center.lat,20);
  current={...current,radio_metros:75};render();drag({latLng:{lat:()=>21,lng:()=>-97}});
  assert.equal(current.radio_metros,75);
});

const clockSource = await readFile(new URL('../src/components/RelojChecador.jsx', import.meta.url), 'utf8');
const {code: clockCode} = babel.transformSync(clockSource,{configFile:false,babelrc:false,presets,plugins:[() => ({visitor:{
  Program:{exit(p){
    const component=p.node.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
    p.node.body=component.body.body.filter(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>['registrarMovimiento','registrarConAccion'].includes(d.id.name)));
  }},
}})]});

for (const gpsRequired of [false,true]) test(`code clock requests location only when required (${gpsRequired})`,async()=>{
  let gpsCalls=0, writes=0;const requests=[];
  const ctx={registrando:false,codigoEmpleado:'123',idEmpresa:1,
    setRegistrando(){},setUbicacionGPS(){},setPendiente(){},setMostrarModalTurno(){},setPopupInfo(){},setCodigoEmpleado(){},mutate(){},setTimeout(){},enqueueSnackbar(){},
    getCurrentLocation:async()=>{gpsCalls++;return {lat:19,lng:-99,accuracy:8,timestamp:12345}},
    axiosInstance:{post:async(url,body)=>{requests.push(body);if(gpsRequired&&!body.latitud_actual)throw {response:{data:{error:'Faltan coordenadas de ubicación'}}};writes++;return {data:{empleado:{nombre:'Test',apellido_paterno:'User'}}}}},
  };
  vm.createContext(ctx);vm.runInContext(clockCode+'\nglobalThis.register=registrarMovimiento;',ctx);
  await ctx.register('123');
  assert.equal(gpsCalls,gpsRequired?1:0);assert.equal(writes,1);
  if(gpsRequired){assert.equal(requests[1].precision_metros,8);assert.equal(requests[1].ubicacion_timestamp,12345)}
});

test('code clock retries after denied GPS without a sticky previous error',async()=>{
  let calls=0,writes=0;
  const ctx={registrando:false,codigoEmpleado:'123',idEmpresa:1,gpsError:'old failure',
    setRegistrando(){},setUbicacionGPS(){},setPendiente(){},setMostrarModalTurno(){},setPopupInfo(){},setCodigoEmpleado(){},mutate(){},setTimeout(){},enqueueSnackbar(){},
    getCurrentLocation:async()=>++calls===1?null:{lat:19,lng:-99,accuracy:8,timestamp:12345},
    axiosInstance:{post:async(url,body)=>{if(!body.latitud_actual)throw {response:{data:{error:'Faltan coordenadas de ubicación'}}};writes++;return {data:{empleado:{nombre:'Test',apellido_paterno:'User'}}}}},
  };
  vm.createContext(ctx);vm.runInContext(clockCode+'\nglobalThis.register=registrarMovimiento;',ctx);
  await ctx.register('123');assert.equal(writes,0);
  await ctx.register('123');assert.equal(writes,1);assert.equal(calls,2);
});
