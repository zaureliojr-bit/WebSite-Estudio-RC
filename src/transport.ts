import {defaultConfig,timesFor,priceFor,validPhone,type Booking,type Config} from './studio';
const nativeFetch=window.fetch.bind(window);const demo=!!(window as any).STUDIO_DEMO;
const ACCESS='studio-access-token',REFRESH='studio-refresh-token';
let token=localStorage.getItem(ACCESS)||sessionStorage.getItem(ACCESS)||'';
let refreshToken=localStorage.getItem(REFRESH)||'';
if(token){localStorage.setItem(ACCESS,token);sessionStorage.removeItem(ACCESS)}
let refreshing:Promise<boolean>|null=null;
let demoConfig=structuredClone(defaultConfig),demoBookings:Booking[]=[];
export function setToken(t:string,refresh?:string){
 token=t;
 if(t)localStorage.setItem(ACCESS,t);else localStorage.removeItem(ACCESS);
 sessionStorage.removeItem(ACCESS);
 if(refresh!==undefined){refreshToken=refresh;if(refresh)localStorage.setItem(REFRESH,refresh);else localStorage.removeItem(REFRESH)}
 if(!t){refreshToken='';localStorage.removeItem(REFRESH)}
}
export function hasSavedSession(){return !!(token||refreshToken)}
export async function renewSession(){
 if(demo)return true;
 if(!refreshToken)return false;
 if(refreshing)return refreshing;
 refreshing=(async()=>{
   try{
     const r=await nativeFetch('/.netlify/functions/api?op=refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken}),cache:'no-store'});
     if(!r.ok){if(r.status===401||r.status===403)setToken('');return false}
     const d=await r.json();
     if(!d.access_token||!d.refresh_token){setToken('');return false}
     setToken(d.access_token,d.refresh_token);
     return true;
   }catch{return false}
 })();
 try{return await refreshing}finally{refreshing=null}
}
async function authorizedFetch(url:RequestInfo|URL,init?:RequestInit){
 let headers=new Headers(init?.headers);if(token)headers.set('Authorization','Bearer '+token);
 let r=await nativeFetch(url,{...init,headers});
 if((r.status===401||r.status===403)&&refreshToken&&await renewSession()){
   headers=new Headers(init?.headers);headers.set('Authorization','Bearer '+token);
   r=await nativeFetch(url,{...init,headers});
 }
 return r;
}
export async function call(op:string,data?:unknown){
 const r=op==='login'?await nativeFetch('/.netlify/functions/api?op=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}):
 await authorizedFetch('/.netlify/functions/api?op='+encodeURIComponent(op),{method:data===undefined?'GET':'POST',...(data===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d;
}
function response(data:unknown,status=200){return Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}))}
async function demoFetch(url:URL,init?:RequestInit){if(url.pathname==='/api/availability'){const d=url.searchParams.get('date')||'2026-12-01',m=d.slice(0,7);const days=Object.fromEntries(Array.from({length:new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0).getDate()},(_,i)=>{const date=m+'-'+String(i+1).padStart(2,'0');return [date,timesFor(demoConfig,date).length>0]}));return response({services:demoConfig.services,adjustment:demoConfig.adjustment,times:timesFor(demoConfig,d).filter(t=>!demoBookings.some(b=>b.slot===d+' '+t)),days})}if(url.pathname.startsWith('/api/proof/'))return response({error:'Comprovantes não são enviados na demonstração do CodePen.'},400);if(!init?.method||init.method==='GET')return response({config:demoConfig,bookings:demoBookings});const b=JSON.parse(String(init.body||'{}'));if(b.action==='config'){demoConfig=b.config;return response({ok:true})}if(b.action==='create'){if(!validPhone(b.phone))return response({error:'Informe WhatsApp com DDD.'},400);const s=demoConfig.services.find(s=>s.id===b.serviceId)!;if(!s||demoBookings.some(x=>x.slot===b.date+' '+b.time))return response({error:'Horário indisponível.'},409);const now=new Date(),v:Booking={...b,id:crypto.randomUUID(),slot:b.date+' '+b.time,serviceName:s.name,price:priceFor(s,demoConfig,b.date),status:'pending',paid:0,proof:null,created:now.toISOString(),due:new Date(now.getTime()+604800000).toISOString()};if(b.rescheduleFrom){const old=demoBookings.find(x=>x.id===b.rescheduleFrom);if(old){old.status='cancelled';old.slot=null}}demoBookings.push(v);return response({booking:v,receiptToken:'demo'})}if(b.action==='update'){const v=demoBookings.find(x=>x.id===b.id);if(!v)return response({error:'Reserva não encontrada.'},404);if(b.status==='confirmed'&&(b.paid??v.paid)<40)return response({error:'Registre o sinal antes de confirmar.'},400);Object.assign(v,Object.fromEntries(['status','paid','phone','price'].filter(k=>k in b).map(k=>[k,b[k]])));if(v.status==='cancelled')v.slot=null;return response({booking:v})}return response({error:'Ação inválida.'},400)}
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.href);if(u.origin===location.origin&&u.pathname.startsWith('/api/')){if(demo)return demoFetch(u,init);let op=u.pathname==='/api/availability'?'availability':u.pathname.startsWith('/api/proof/')?'proof':'studio';const target=new URL('/.netlify/functions/api',location.origin);target.searchParams.set('op',op);if(u.searchParams.get('date'))target.searchParams.set('date',u.searchParams.get('date')!);if(op==='proof')target.searchParams.set('id',u.pathname.split('/').at(-1)!);return authorizedFetch(target,init)}return nativeFetch(input,init)};
(window as any).studioDownloadProof=async(id:string)=>{try{const r=await window.fetch('/api/proof/'+id);if(!r.ok){const d=await r.json();throw Error(d.error||'Não foi possível obter o comprovante.')}const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='comprovante-'+id;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(e){alert(e instanceof Error?e.message:'Falha ao baixar.')}};
