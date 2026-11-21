'use strict';
const labels={
 es:{title:'Brasil · Patentamientos de motos nuevas',desc:'Elegí una edición, marca y modelo para ver la página correspondiente del boletín de FENABRAVE.',period:'Edición mensual',brand:'Marca',model:'Modelo',brandTotal:'Total de la marca',pickModel:'Elegí un modelo',all:'Todas las marcas',overview:'Resumen nacional',monthly:'Patentamientos del mes',ytd:'Acumulado del año',history:'Historial de la selección',page:'Página',open:'Abrir boletín original ↗',scope:'Las marcas y los modelos tienen rankings separados. El boletín detalla los modelos destacados de cada segmento según el acumulado del año. Una ausencia indica que la edición no informa esa cifra. Cada mes conserva la versión de su propio boletín.',load:'Cargar cifras internas',hint:'Seleccioná el archivo MotoMarket_Brasil_interno.json para ver los valores y el historial aquí. El archivo se lee sólo en este navegador.',ok:'Cifras cargadas.',fail:'No se pudo validar el archivo.',none:'Sin cifra publicada',back:'← Mercados',error:'No se pudo cargar el índice de ediciones.'},
 en:{title:'Brazil · New motorcycle registrations',desc:'Choose an issue, make and model to view the relevant page of the FENABRAVE bulletin.',period:'Monthly issue',brand:'Make',model:'Model',brandTotal:'Make total',pickModel:'Choose a model',all:'All makes',overview:'National summary',monthly:'Monthly registrations',ytd:'Year to date',history:'History of this selection',page:'Page',open:'Open original bulletin ↗',scope:'Makes and models have separate rankings. Each issue lists the leading models in each segment by year-to-date registrations. A missing entry means the figure was not reported. Each month uses its own edition.',load:'Load internal figures',hint:'Choose MotoMarket_Brasil_interno.json to display figures and history here. The file is read only in this browser.',ok:'Figures loaded.',fail:'The file could not be validated.',none:'Not reported',back:'← Markets',error:'Could not load the issue index.'},
 zh:{title:'巴西 · 新摩托车上牌量',desc:'选择月报、品牌和车型，查看 FENABRAVE 原始月报中的对应页面。',period:'月报',brand:'品牌',model:'车型',brandTotal:'品牌合计',pickModel:'选择车型',all:'所有品牌',overview:'全国概况',monthly:'当月上牌量',ytd:'年初至今累计',history:'查看历史记录',page:'页码',open:'打开原始月报 ↗',scope:'品牌和车型分别排名。各细分市场按年内累计上牌量列出领先车型。未列出表示当期未报告该数值。每月使用其当期发布值。',load:'载入内部数据',hint:'选择 MotoMarket_Brasil_interno.json 查看数值和历史。文件仅在此浏览器内读取。',ok:'数据已载入。',fail:'无法验证文件。',none:'未公布',back:'← 各国市场',error:'无法载入月报索引。'}
};
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let lang=params.get('lang')||localStorage.getItem('motomarket-language')||'es';
if(!labels[lang])lang='es';
let period=params.get('period'),brand=params.get('brand')||'',model=params.get('model')||'';
let index,figures,privateEdition=Boolean(document.getElementById('localFigures'));
function fill(id,items,value){$(id).replaceChildren(...items.map(([key,label])=>new Option(label,key)));$(id).value=value;}
function number(v){return Number.isInteger(v)?v.toLocaleString({es:'es-AR',en:'en-US',zh:'zh-CN'}[lang]):'—';}
function brandOf(name){return name.slice(0,name.indexOf('/'));}
function rowData(month){
 const data=figures?.[month];
 if(!data)return [];
 if(model)return data.models[model]?.slice(2)||[];
 return data.brands[brand]||[];
}
function paint(){
 const t=labels[lang],months=Object.keys(index).sort().reverse();
 if(!months.includes(period))period=months[0];
 const item=index[period],models=Object.keys(item.models).sort();
 const allModels=new Set(Object.values(index).flatMap(e=>Object.keys(e.models)));
 const allBrands=new Set(Object.values(index).flatMap(e=>e.brands).concat([...allModels].map(brandOf)));
 const brands=[...new Set([...item.brands,...models.map(brandOf),...(allBrands.has(brand)?[brand]:[])])].sort();
 if(!brands.includes(brand))brand='';
 const choices=models.filter(m=>!brand||brandOf(m)===brand);
 if(model&&allModels.has(model)&&(!brand||brandOf(model)===brand)&&!choices.includes(model))choices.push(model);
 if(!choices.includes(model))model='';
 document.documentElement.lang=lang==='zh'?'zh-CN':lang;document.title=t.title+' · MotoMarket';
 for(const [id,key] of Object.entries({title:'title',desc:'desc',periodLabel:'period',brandLabel:'brand',modelLabel:'model',monthText:'monthly',yearText:'ytd',historyText:'history',hPeriod:'period',hMonth:'monthly',hYear:'ytd',scope:'scope',importLabel:'load',importHint:'hint',back:'back',original:'open'}))$(id).textContent=t[key];
 $('back').href=privateEdition?'https://motomarket.dissenstudio.com/mercados/?market=br-national&lang='+lang:'../?market=br-national&lang='+lang;
 $('language').value=lang;
 fill('period',months.map(v=>[v,v]),period);
 fill('brand',[['',t.all],...brands.map(v=>[v,v])],brand);
 fill('model',[['',brand?t.brandTotal:t.pickModel],...choices.map(v=>[v,brand?v.slice(brand.length+1):v])],model);
 const present=model?Object.hasOwn(item.models,model):!brand||item.brands.includes(brand);
 const page=model&&present?item.models[model][1]:item.brandPage;
 const search=model||brand;
 const url=item.url+'#page='+page+'&navpanes=0&view=FitH'+(search?'&search='+encodeURIComponent(search):'');
 $('original').href=url;
 $('sourceLabel').textContent='FENABRAVE · Ed. '+item.edition+' · '+t.page+' '+page;
 $('summary').textContent=[period,model||brand||t.all,model&&present?item.models[model][0]:'',!present?t.none:''].filter(Boolean).join(' · ');
 const viewer=$('viewer');
 viewer.hidden=!present;$('sourceLabel').hidden=!present;
 if(privateEdition){viewer.hidden=true;}
 if(!privateEdition&&present&&viewer.dataset.url!==url){const frame=document.createElement('iframe');frame.className='source-frame';frame.title='FENABRAVE · '+period+' · '+page;frame.src=url;viewer.replaceChildren(frame);viewer.dataset.url=url;}
 const enabled=Boolean(figures&&(model||brand));
 $('metrics').hidden=$('history').hidden=!enabled;
 if(enabled){
  const current=rowData(period);$('monthValue').textContent=number(current[0]);$('yearValue').textContent=number(current[1]);
  const series=months.map(p=>[p,...rowData(p)]);
  const max=Math.max(1,...series.map(r=>r[1]||0));
  $('rows').replaceChildren(...series.map(([p,a,b])=>{
   const tr=document.createElement('tr');
   for(const val of [p,number(a),number(b)]){const td=document.createElement('td');td.textContent=val;tr.append(td);}
   if(Number.isInteger(a)){const bar=document.createElement('span');bar.className='bar';bar.style.width=(a/max*60)+'px';tr.children[1].prepend(bar,' ');}
   return tr;
  }));
 }
 $('importBox').hidden=privateEdition;
 if(!privateEdition){const u=new URL(location.href);for(const [k,v] of Object.entries({lang,period,brand,model})){if(v)u.searchParams.set(k,v);else u.searchParams.delete(k);}history.replaceState({},'',u);}
}
function validFigures(x){
 const validCount=n=>n===null||(Number.isSafeInteger(n)&&n>=0);
 for(const [p,e] of Object.entries(index)){
  const v=x[p];if(!v||v.hash!==e.hash||v.url!==e.url||Object.keys(v.brands).length!==e.brands.length||Object.keys(v.models).length!==Object.keys(e.models).length)return false;
  for(const name of e.brands){const r=v.brands[name];if(!Array.isArray(r)||r.length!==2||!r.every(validCount))return false;}
  for(const [name,[group,page]] of Object.entries(e.models)){const r=v.models[name];if(!Array.isArray(r)||r.length!==4||r[0]!==group||r[1]!==page||!r.slice(2).every(validCount))return false;}
 }
 return true;
}
async function init(){
 if(privateEdition){figures=JSON.parse($('localFigures').textContent);index=JSON.parse($('localIndex').textContent);}
 else{const r=await fetch('indice.json');if(!r.ok)throw Error(r.status);index=await r.json();}
 $('language').onchange=e=>{lang=e.target.value;localStorage.setItem('motomarket-language',lang);paint();};
 $('period').onchange=e=>{period=e.target.value;paint();};
 $('brand').onchange=e=>{brand=e.target.value;model='';paint();};
 $('model').onchange=e=>{model=e.target.value;if(model)brand=brandOf(model);paint();};
 $('localFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!validFigures(data))throw Error();figures=data;paint();$('importStatus').textContent=labels[lang].ok;}catch{$('importStatus').textContent=labels[lang].fail;}};
 paint();
}
init().catch(()=>{$('summary').textContent=labels[lang].error;});
