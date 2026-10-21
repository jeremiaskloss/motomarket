/* Public, aggregated market data only. Queries run off the main UI thread. */
function analyze(rows, q, meta) {
 const filters = [[1,'brands'],[2,'models'],[3,'categories'],[5,'zones'],[6,'provinces'],[7,'origins']].map(([i,k])=>[i,new Set(q[k]||[])]);
 const ccs=meta.dictionary.cc.map(v=>{const t=String(v).replace(',','.');return /^\d+(\.\d+)?$/.test(t)?Number(t):null;});
 const cutoffMonth=(Number(meta.cutoff.slice(0,4))-meta.baseYear)*12+Number(meta.cutoff.slice(5,7))-1;
 const cut=new Date(meta.cutoff+'T00:00:00Z');const partial=cut.getUTCDate()<new Date(Date.UTC(cut.getUTCFullYear(),cut.getUTCMonth()+1,0)).getUTCDate();
 const closedEnd=q.to===cutoffMonth&&partial?q.to-1:q.to;
 const compareFrom=q.from-12,compareTo=closedEnd-12;
 const comparisonAvailable=closedEnd>=q.from&&compareFrom>=0;
 const monthValues=new Map(),prevValues=new Map(),groups=new Map(),ranks=new Map(),brands=new Set();
 const facets={brands:new Map(),models:new Map(),categories:new Map(),zones:new Map(),provinces:new Map(),cc:new Map(),origins:new Map()};
 let total=0,market=0,closedTotal=0,previous=0;
 const inc=(map,key,v)=>map.set(key,(map.get(key)||0)+v);
 const matches=r=>{for(const [index,set] of filters)if(set.size&&!set.has(r[index]))return false;const cc=ccs[r[4]];return !((q.ccMin!==null&&(cc===null||cc<q.ccMin))||(q.ccMax!==null&&(cc===null||cc>q.ccMax)));};
 const ccBucket=r=>{const v=ccs[r[4]];return v===null?'unknown':v<=110?'0–110':v<=150?'111–150':v<=250?'151–250':v<=500?'251–500':v<=800?'501–800':'801+';};
 const dimension=(r,dim)=>dim==='cc'?ccBucket(r):r[({brands:1,models:2,categories:3,zones:5,provinces:6,origins:7})[dim]];
 const rank=(r)=>{const k=r[1]+':'+r[2];if(!ranks.has(k))ranks.set(k,{brand:r[1],model:r[2],total:0,closed:0,previous:0,cc:new Set(),categories:new Set()});return ranks.get(k);};
 for(const r of rows){
  const m=r[0],n=r[8],inRange=m>=q.from&&m<=q.to,inPrevious=comparisonAvailable&&m>=compareFrom&&m<=compareTo;
  if(inRange)market+=n;
  if((!inRange&&!inPrevious)||!matches(r))continue;
  const product=rank(r);
  if(inPrevious){previous+=n;inc(prevValues,m+12,n);product.previous+=n;}
  if(!inRange)continue;
  total+=n;inc(monthValues,m,n);brands.add(r[1]);product.total+=n;product.cc.add(r[4]);product.categories.add(r[3]);
  if(m<=closedEnd){closedTotal+=n;product.closed+=n;}
  for(const [dim,map] of Object.entries(facets))inc(map,dimension(r,dim),n);
  const g=q.trend==='total'?'total':dimension(r,q.trend);
  if(!groups.has(g))groups.set(g,new Map());inc(groups.get(g),m,n);
 }
 const monthly=[];for(let m=q.from;m<=q.to;m++)monthly.push({month:m,value:monthValues.get(m)||0,previous:comparisonAvailable&&m<=closedEnd?(prevValues.get(m)||0):null,partial:partial&&m===cutoffMonth});
 const topGroups=[...groups].sort((a,b)=>[...b[1].values()].reduce((s,v)=>s+v,0)-[...a[1].values()].reduce((s,v)=>s+v,0)).slice(0,5).map(([id,values])=>({id,values:monthly.map(p=>values.get(p.month)||0)}));
 const distributions=Object.fromEntries(Object.entries(facets).map(([dim,map])=>[dim,[...map].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({id,count}))]));
 return {total,market,closedTotal,previous,comparisonAvailable,closedEnd,partial:partial&&q.to===cutoffMonth,share:market?total/market:0,yoy:comparisonAvailable&&previous?(closedTotal/previous-1)*100:null,monthly,series:topGroups,facets:distributions,brandCount:brands.size,models:[...ranks.values()].filter(r=>r.total).sort((a,b)=>b.total-a.total).map(r=>({...r,cc:[...r.cc],categories:[...r.categories],yoy:comparisonAvailable&&r.previous?(r.closed/r.previous-1)*100:null}))};
}
if(typeof module!=='undefined'&&module.exports)module.exports={analyze};
if(typeof self!=='undefined'&&typeof document==='undefined'){
 let meta,cache=new Map();
 async function load(year){if(cache.has(year))return cache.get(year);const entry=meta.years.find(y=>y.year===year);if(!entry)return [];let response,rows;if(typeof DecompressionStream!=='undefined'){response=await fetch(entry.file);if(!response.ok)throw Error('Data download failed ('+response.status+')');const bytes=new Uint8Array(await response.arrayBuffer());const body=bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))):new Response(bytes);rows=JSON.parse(await body.text());}else{response=await fetch(entry.fallback);if(!response.ok)throw Error('Data download failed ('+response.status+')');rows=await response.json();}cache.set(year,rows);return rows;}
 self.onmessage=async event=>{const {id,type,payload}=event.data;try{if(type==='init'){meta=payload;self.postMessage({id,ready:true});return;}const q=payload;const start=Math.max(0,q.from-12);const years=[];for(let y=meta.baseYear+Math.floor(start/12);y<=meta.baseYear+Math.floor(q.to/12);y++)years.push(y);const tables=await Promise.all(years.map(load));const result=analyze(tables.flat(),q,meta);self.postMessage({id,result});}catch(error){self.postMessage({id,error:error.message});}};
}
