import {randomUUID,createHash} from 'node:crypto';
import {defaultConfig,upgradeConfig,timesFor,priceFor,validPhone,normalizedPhone,whatsappLink,money} from '../../server/studio.ts';
class Fault extends Error{constructor(message,status=400){super(message);this.status=status;}}
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hash=t=>createHash('sha256').update(t).digest('hex');
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function configuration(env){const vars=env||process.env;const url=(vars.SUPABASE_URL||'').replace(/\/$/,'');const secret=vars.SUPABASE_SERVICE_ROLE_KEY||'';const anon=vars.SUPABASE_ANON_KEY||'';const owner=(vars.OWNER_EMAIL||'').trim().toLowerCase();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!secret||!anon||!emailPattern.test(owner))throw new Fault('O site ainda precisa ser configurado. Veja o guia INSTRUCOES no pacote.',503);return{url,secret,anon,owner,resendKey:vars.RESEND_API_KEY||'',emailFrom:vars.EMAIL_FROM||'',notificationEmail:vars.NOTIFICATION_EMAIL||owner,vapidPublic:vars.VAPID_PUBLIC_KEY||'',vapidPrivate:vars.VAPID_PRIVATE_KEY||'',vapidSubject:vars.VAPID_SUBJECT||''};}
function headersForSecret(c){return{apikey:c.secret,...(c.secret.startsWith('eyJ')?{Authorization:'Bearer '+c.secret}:{})};}
async function sb(c,path,{method='GET',data,headers={}}={}){const r=await fetch(c.url+path,{method,headers:{...headersForSecret(c),...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(12000)});if(!r.ok){let d={};try{d=await r.json()}catch{}if(d.code==='23505')throw new Fault('Este horário acabou de ser reservado. Escolha outro.',409);throw new Fault('Não foi possível acessar os dados. Confira a configuração do banco e tente novamente.',502);}if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null;}
async function isOwner(req,c){const a=req.headers.get('authorization')||'';if(!a.startsWith('Bearer '))return false;const r=await fetch(c.url+'/auth/v1/user',{headers:{apikey:c.anon,Authorization:a},signal:AbortSignal.timeout(10000)});if(!r.ok)return false;const u=await r.json();return !!u.id&&u.email?.toLowerCase()===c.owner&&!!u.email_confirmed_at;}
async function config(c){const rows=await sb(c,'/rest/v1/studio_settings?id=eq.config&select=data');return upgradeConfig(rows[0]?.data||null);}
async function findBooking(c,id){if(!/^[a-f0-9-]{36}$/i.test(id||''))throw new Fault('Agendamento inválido.',404);const rows=await sb(c,'/rest/v1/studio_bookings?id=eq.'+id+'&select=data');if(!rows[0])throw new Fault('Agendamento não encontrado.',404);return rows[0].data;}
async function saveBooking(c,b){await sb(c,'/rest/v1/studio_bookings?id=eq.'+b.id,{method:'PATCH',data:{slot:b.slot,data:b}});}
function validateConfig(c){const time=/^([01]\d|2[0-3]):[0-5]\d$/;if(!c||!Array.isArray(c.services)||!c.services.length||c.services.length>100||new Set(c.services.map(s=>s.id)).size!==c.services.length||c.services.some(s=>typeof s.id!=='string'||typeof s.name!=='string'||!s.name.trim()||s.name.length>160||(s.price!==null&&(!Number.isFinite(s.price)||s.price<0||s.price>100000)))||!Array.isArray(c.weekly)||c.weekly.some(d=>!Number.isInteger(d)||d<0||d>6)||!time.test(c.start)||!time.test(c.end)||c.start>=c.end||!Number.isInteger(c.interval)||c.interval<10||c.interval>240||!Number.isFinite(c.adjustment)||c.adjustment<0||c.adjustment>10000||!c.overrides||Object.entries(c.overrides).some(([d,o])=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||typeof o.open!=='boolean'||!Array.isArray(o.times)||new Set(o.times).size!==o.times.length||o.times.some(t=>!time.test(t))))throw new Fault('Confira os horários e os valores.');}
async function notify(c,b,origin){
 const key=c.resendKey,from=c.emailFrom,to=c.notificationEmail;
 if(!key||!from||!to)return {status:'unconfigured',detail:'Confira RESEND_API_KEY, EMAIL_FROM e NOTIFICATION_EMAIL na Cloudflare.'};
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'studio-booking-'+b.id},body:JSON.stringify({from,to:[to],subject:`Novo agendamento · ${b.name} · ${b.date} ${b.time}`,text:`Studio Raquel Cândida\n\nCliente: ${b.name}\nWhatsApp: ${b.phone}\nData: ${b.date} às ${b.time}\nServiço: ${b.serviceName}\nCor: ${b.color}\nValor: ${money(b.price)}\nObservações: ${b.notes||'Nenhuma'}\n\nGestão: ${origin}/#admin`}),signal:AbortSignal.timeout(8000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
   const errorCode=String(result.name||result.code||'resend_error').slice(0,70);
   const message=String(result.message||'Falha no serviço de e-mail').slice(0,250);
   console.error('Studio RC: Resend não aceitou notificação',response.status,errorCode);
   return {status:'failed',detail:`Resend HTTP ${response.status}: ${errorCode} — ${message}`};
  }
  return {status:'sent',detail:'Aceito pelo Resend',id:result.id||null};
 }catch(e){console.error('Studio RC: erro ao solicitar notificação ao Resend',e instanceof Error?e.name:'unknown');return {status:'failed',detail:'Erro de conexão ou timeout ao chamar Resend'};}
}
async function sendPush(c,b){
 if(!c.vapidPublic||!c.vapidPrivate)return {status:'unconfigured'};
 let devices=[];
 try{devices=await sb(c,'/rest/v1/studio_push_subscriptions?select=endpoint,subscription&limit=100');}
 catch{return {status:'database_not_ready'};}
 if(!devices.length)return {status:'no_devices'};
 try{
  const mod=await import('web-push'),webPush=mod.default||mod;
  webPush.setVapidDetails(c.vapidSubject||'mailto:'+c.owner,c.vapidPublic,c.vapidPrivate);
  let delivered=0;
  for(const device of devices){
   try{
    await webPush.sendNotification(device.subscription,JSON.stringify({title:'Novo agendamento · Studio RC',body:`${b.name} · ${b.date.split('-').reverse().join('/')} às ${b.time} · ${b.serviceName}`,url:'/#admin'}),{TTL:3600});
    delivered++;
   }catch(error){
    if(error?.statusCode===404||error?.statusCode===410){
     await sb(c,'/rest/v1/studio_push_subscriptions?endpoint=eq.'+encodeURIComponent(device.endpoint),{method:'DELETE'}).catch(()=>{});
    }else console.error('Studio RC: entrega push rejeitada',error?.statusCode||'unknown');
   }
  }
  return {status:delivered?'sent':'failed',delivered};
 }catch(e){console.error('Studio RC: push indisponível',e instanceof Error?e.message:'unknown');return {status:'failed'};}
}
export default async function handler(req,env){try{const u=new URL(req.url),origin=req.headers.get('origin');if(req.method!=='GET'&&origin&&origin!==u.origin)throw new Fault('Origem não autorizada.',403);if(!['GET','POST'].includes(req.method))throw new Fault('Método não permitido.',405);const c=configuration(env),op=u.searchParams.get('op');
if(op==='login'){if(req.method!=='POST')throw new Fault('Método não permitido.',405);const body=await req.json();if(typeof body.email!=='string'||body.email.trim().toLowerCase()!==c.owner||typeof body.password!=='string'||body.password.length>500)throw new Fault('E-mail ou senha inválidos.',401);const r=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.anon,'Content-Type':'application/json'},body:JSON.stringify({email:body.email.trim(),password:body.password}),signal:AbortSignal.timeout(10000)});const d=await r.json();if(!r.ok||!d.access_token||d.user?.email?.toLowerCase()!==c.owner||!d.user?.email_confirmed_at)throw new Fault('E-mail ou senha inválidos. Confira se a conta está confirmada.',401);return json({access_token:d.access_token,refresh_token:d.refresh_token,expires_in:d.expires_in,emailReady:!!(c.resendKey&&c.emailFrom)});}
if(op==='refresh'){
 if(req.method!=='POST')throw new Fault('Método não permitido.',405);
 const body=await req.json(),refresh=body?.refresh_token;
 if(typeof refresh!=='string'||refresh.length<10||refresh.length>4096)throw new Fault('Sessão expirada. Entre novamente.',401);
 const r=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:c.anon,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh}),signal:AbortSignal.timeout(10000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.access_token||!d.refresh_token||d.user?.email?.toLowerCase()!==c.owner||!d.user?.email_confirmed_at)throw new Fault('Sessão expirada. Entre novamente.',401);
 return json({access_token:d.access_token,refresh_token:d.refresh_token,expires_in:d.expires_in,emailReady:!!(c.resendKey&&c.emailFrom)});
}
if(op==='push-config'){if(!await isOwner(req,c))throw new Fault('Acesso restrito.',403);return json({enabled:!!(c.vapidPublic&&c.vapidPrivate),publicKey:c.vapidPublic||''});}
if(op==='push-test'){
 if(req.method!=='POST'||!await isOwner(req,c))throw new Fault('Acesso restrito.',403);
 const result=await sendPush(c,{name:'Notificação de teste',date:new Date().toISOString().slice(0,10),time:'--:--',serviceName:'Teste de alertas'});
 return json(result);
}
if(op==='push-subscription'){
 if(req.method!=='POST')throw new Fault('Método não permitido.',405);
 if(!await isOwner(req,c))throw new Fault('Acesso restrito à proprietária.',403);
 const body=await req.json(),subscription=body.subscription;
 if(body.action==='subscribe'){
  if(!subscription||typeof subscription.endpoint!=='string'||subscription.endpoint.length>2048||!/^https:\/\//.test(subscription.endpoint)||typeof subscription.keys?.p256dh!=='string'||typeof subscription.keys?.auth!=='string')throw new Fault('Inscrição push inválida.');
  await sb(c,'/rest/v1/studio_push_subscriptions?on_conflict=endpoint',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},data:{endpoint:subscription.endpoint,subscription,updated_at:new Date().toISOString()}});
 }else if(body.action==='unsubscribe'){
  if(typeof body.endpoint!=='string')throw new Fault('Inscrição inválida.');
  await sb(c,'/rest/v1/studio_push_subscriptions?endpoint=eq.'+encodeURIComponent(body.endpoint),{method:'DELETE'});
 }else throw new Fault('Ação inválida.');
 return json({ok:true});
}
if(op==='availability'){if(req.method!=='GET')throw new Fault('Método não permitido.',405);const date=u.searchParams.get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00').getTime()))throw new Fault('Data inválida.');const conf=await config(c),m=date.slice(0,7);const rows=await sb(c,'/rest/v1/studio_bookings?select=slot&slot=like.'+encodeURIComponent(date+' %'));const used=new Set(rows.map(r=>r.slot));const times=timesFor(conf,date).filter(t=>!used.has(date+' '+t)&&new Date(date+'T'+t+':00-03:00').getTime()>Date.now());const days=Object.fromEntries(Array.from({length:new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0).getDate()},(_,i)=>{const d=m+'-'+String(i+1).padStart(2,'0');return[d,timesFor(conf,d).length>0]}));return json({services:conf.services,adjustment:conf.adjustment,times,days});}
const owner=await isOwner(req,c);
if(op==='proof'){const b=await findBooking(c,u.searchParams.get('id'));if(req.method==='GET'){if(!owner)throw new Fault('Acesso restrito à proprietária.',403);if(!b.proof)throw new Fault('Sem comprovante.',404);const r=await fetch(c.url+'/storage/v1/object/studio-receipts/'+b.proof,{headers:headersForSecret(c),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Fault('Comprovante não encontrado.',404);return new Response(r.body,{headers:{'Content-Type':r.headers.get('content-type')||'application/octet-stream','Content-Disposition':'attachment; filename="comprovante"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}const token=req.headers.get('x-receipt-token')||'';if(!owner&&(!token||!b.uploadTokenHash||hash(token)!==b.uploadTokenHash))throw new Fault('Acesso não autorizado.',403);if(b.status==='cancelled')throw new Fault('Reserva cancelada.');const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||!file.size||file.size>3*1024*1024||!['image/png','image/jpeg','application/pdf'].includes(file.type))throw new Fault('Envie JPG, PNG ou PDF de até 3 MB.');const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===255&&bytes[1]===216;if(!valid)throw new Fault('Formato do comprovante inválido.');const key=b.id+'/'+randomUUID();const r=await fetch(c.url+'/storage/v1/object/studio-receipts/'+key,{method:'POST',headers:{...headersForSecret(c),'Content-Type':file.type,'x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Fault('Não foi possível salvar o comprovante.',502);b.proof=key;if(b.status!=='confirmed')b.status='review';await saveBooking(c,b);return json({ok:true});}
if(op!=='studio')throw new Fault('Recurso não encontrado.',404);
if(req.method==='GET'){if(!owner)throw new Fault('Acesso restrito à proprietária.',403);const bookings=[];for(let page=0;page<20;page++){const rows=await sb(c,'/rest/v1/studio_bookings?select=data&order=id',{headers:{Range:`${page*500}-${page*500+499}`}});bookings.push(...rows.map(r=>r.data));if(rows.length<500)break;if(page===19)throw new Fault('Limite de 10 mil reservas atingido. Exporte e arquive o histórico.',413);}return json({config:await config(c),bookings,emailReady:!!(c.resendKey&&c.emailFrom)});}
const body=await req.json();if(body.action!=='create'&&!owner)throw new Fault('Acesso restrito à proprietária.',403);if(body.rescheduleFrom&&!owner)throw new Fault('Reagendamento restrito à proprietária.',403);
if(body.action==='import_legacy'){
  if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>200)throw new Fault('Envie de 1 a 200 agendamentos por arquivo.');
  const seen=new Set(),invalid=[];
  const prepared=body.rows.map((r,i)=>{
    if(!r||typeof r!=='object') {invalid.push(i+1);return null}
    const date=String(r.data||'').trim(),time=String(r.horario||'').trim(),name=String(r.nome||'').trim(),phone=String(r.whatsapp||'').replace(/\D/g,''),service=String(r.procedimento||'').trim(),slot=date+' '+time;
    const amount=r.valor==null||String(r.valor).trim()===''?null:Number(String(r.valor).replace(',','.'));
    const actualDate=new Date(date+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(actualDate.getTime())||actualDate.toISOString().slice(0,10)!==date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!name||name.length>120||!service||service.length>180||!Number.isFinite(amount)&&amount!==null||amount!==null&&(amount<0||amount>100000)||phone&&!validPhone(phone)||seen.has(slot)){invalid.push(i+1);return null}
    seen.add(slot);
    const remarks=String(r.observacoes||'').slice(0,1400),orig=String(r.horario_original||'').slice(0,30);
    const notes=[remarks,orig&&orig!==time?'Horário original da agenda antiga: '+orig:'','Importado da agenda antiga em '+new Date().toISOString().slice(0,10)].filter(Boolean).join(' | ');
    return {id:randomUUID(),name,phone,serviceName:service,serviceId:'legacy',date,time,color:'A confirmar',notes,price:amount,paid:0,status:'pending',proof:null,created:new Date().toISOString(),due:new Date().toISOString(),slot,imported:true,source:'agenda-antiga'};
  });
  if(invalid.length)throw new Fault('Linhas inválidas ou horários duplicados no arquivo: '+invalid.slice(0,15).join(', ')+(invalid.length>15?'...':''),400);
  const slots=prepared.map(b=>b.slot);
  const existing=await sb(c,'/rest/v1/studio_bookings?select=slot&slot=in.('+slots.map(x=>encodeURIComponent('"'+x+'"')).join(',')+')');
  const occupied=new Set(existing.map(x=>x.slot));
  const inserted=[],skipped=[];
  for(const b of prepared){if(occupied.has(b.slot)){skipped.push({date:b.date,time:b.time,name:b.name,reason:'Horário já ocupado'});continue}
    try{await sb(c,'/rest/v1/studio_bookings',{method:'POST',data:{id:b.id,slot:b.slot,data:b}});inserted.push(b.id)}
    catch(e){if(e instanceof Fault&&e.status===409){skipped.push({date:b.date,time:b.time,name:b.name,reason:'Horário ocupado durante importação'});continue}throw e}
  }
  return json({ok:true,imported:inserted.length,skipped,received:prepared.length});
}
if(body.action==='config'){validateConfig(body.config);await sb(c,'/rest/v1/studio_settings?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},data:{id:'config',data:body.config}});return json({ok:true});}
if(body.action==='create'){const conf=await config(c),s=conf.services.find(s=>s.id===body.serviceId);if(!s||typeof body.name!=='string'||!body.name.trim()||body.name.length>120||typeof body.phone!=='string'||!validPhone(body.phone)||typeof body.color!=='string'||!body.color.trim()||body.color.length>100||typeof body.notes!=='string'||body.notes.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||!timesFor(conf,body.date).includes(body.time))throw new Fault('Confira nome, WhatsApp com DDD, serviço, cor e horário.');const at=new Date(body.date+'T'+body.time+':00-03:00');if(!Number.isFinite(at.getTime())||at.getTime()<Date.now())throw new Fault('Escolha um horário futuro.');const now=new Date(),receiptToken=randomUUID()+randomUUID();const b={id:randomUUID(),name:body.name.trim(),phone:normalizedPhone(body.phone),uploadTokenHash:hash(receiptToken),date:body.date,time:body.time,serviceId:s.id,serviceName:s.name,color:body.color.trim(),notes:body.notes,price:priceFor(s,conf,body.date),status:'pending',paid:0,proof:null,created:now.toISOString(),due:new Date(Math.min(now.getTime()+604800000,at.getTime())).toISOString(),slot:body.date+' '+body.time,whatsappConsent:body.whatsappConsent===true,whatsappNotification:null};if(body.rescheduleFrom){await findBooking(c,body.rescheduleFrom);await sb(c,'/rest/v1/rpc/studio_reschedule',{method:'POST',data:{old_id:body.rescheduleFrom,new_data:b}});}else await sb(c,'/rest/v1/studio_bookings',{method:'POST',data:{id:b.id,slot:b.slot,data:b}});const email=await notify(c,b,u.origin);
b.emailNotification=email;
await saveBooking(c,b).catch(()=>{});
const pushStatus=await sendPush(c,b);
return json({booking:owner?b:{id:b.id,name:b.name,date:b.date,time:b.time,serviceName:b.serviceName,price:b.price,due:b.due},receiptToken,emailStatus:email.status,pushStatus:pushStatus.status});}
if(body.action==='retry_email'){
 const booking=await findBooking(c,body.id);
 if(booking.emailNotification?.status==='sent')return json({ok:true,status:'sent',detail:'Envio já aceito pelo Resend.'});
 const result=await notify(c,booking,u.origin);
 booking.emailNotification=result;
 await saveBooking(c,booking);
 return json({ok:result.status==='sent',status:result.status,detail:result.detail});
}
if(body.action==='update'){const b=await findBooking(c,body.id);if(b.status==='cancelled')throw new Fault('Esta reserva já foi cancelada.');if(body.phone!==undefined){if(typeof body.phone!=='string'||!validPhone(body.phone))throw new Fault('WhatsApp inválido.');b.phone=normalizedPhone(body.phone);}if(body.price!==undefined){if(body.price!==null&&(!Number.isFinite(body.price)||body.price<0||body.price>100000))throw new Fault('Valor inválido.');b.price=body.price;}if(body.paid!==undefined){if(!Number.isFinite(body.paid)||body.paid<0||body.paid>100000)throw new Fault('Sinal inválido.');b.paid=body.paid;}if(body.status!==undefined){if(!['pending','review','confirmed','cancelled'].includes(body.status))throw new Fault('Status inválido.');if(body.status==='confirmed'&&b.paid<40)throw new Fault('Registre o recebimento de R$40,00 antes de confirmar.');b.status=body.status;}if(b.status==='confirmed'&&b.paid<40)b.status='pending';if(b.status==='cancelled')b.slot=null;await saveBooking(c,b);return json({booking:b});}throw new Fault('Ação inválida.');
}catch(e){return json({error:e instanceof Fault?e.message:'Não foi possível concluir. Tente novamente.'},e instanceof Fault?e.status:500);}}
