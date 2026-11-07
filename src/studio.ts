export type Service={id:string;name:string;price:number|null;note:string;decemberAdjustment?:boolean;decemberExtra?:number};
export type Config={services:Service[];weekly:number[];start:string;end:string;interval:number;overrides:Record<string,{open:boolean;times:string[]}>;adjustment:number;catalogVersion?:number;notificationEmail?:string};
export type Booking={id:string;name:string;phone?:string;uploadTokenHash?:string;date:string;time:string;serviceId:string;serviceName:string;color:string;notes:string;price:number|null;status:string;paid:number;proof:string|null;created:string;due:string;slot:string|null};
export const defaultConfig:Config={catalogVersion:4,weekly:[2,3,4,5,6],start:'08:00',end:'20:00',interval:50,adjustment:10,overrides:Object.fromEntries(['2026-12-13','2026-12-25','2026-12-26','2026-12-27'].map(d=>[d,{open:false,times:[]}])),services:[
{id:'bio',name:'Bio humano + aplicação · 250 g',price:249.99,note:'5/6 telas • 250 g',decemberAdjustment:false},
{id:'bio4',name:'Bio humano + aplicação · 4 telas',price:199.99,note:'180/200 g • volume natural',decemberExtra:39.99},
{id:'russa',name:'Fibra russa + colocação',price:349,note:'Até 75 cm'},
{id:'cacheado',name:'Cacheado + aplicação',price:299.99,note:'Cabelo sob avaliação'},
{id:'progressiva',name:'Progressiva',price:149.99,note:'Serviço individual'},
{id:'botox',name:'Botox',price:120,note:'Serviço individual'},
{id:'escova',name:'Escova com hidratação',price:89.99,note:'Cuidado e finalização'},
{id:'remocao',name:'Remoção',price:59.99,note:'Ponto americano'},
{id:'manutencao',name:'Colocação / manutenção de mega',price:189.99,note:'Colocação ou manutenção'},
{id:'combo1',name:'Progressiva + bio humano + aplicação',price:399.99,note:'Procedimentos combinados'},
{id:'combo2',name:'Remoção + bio humano + aplicação',price:289.99,note:'Procedimentos combinados'},
{id:'combo3',name:'Progressiva + fibra russa + aplicação',price:439.99,note:'Procedimentos combinados'},
{id:'combo4',name:'Escova + fibra russa + aplicação',price:399.99,note:'Procedimentos combinados'},
{id:'combo5',name:'Remoção + fibra russa + aplicação',price:399.99,note:'Procedimentos combinados'}]};
export function generatedTimes(c:Config){const toMin=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));const result:string[]=[];for(let i=toMin(c.start);i+c.interval<=toMin(c.end);i+=c.interval)result.push(`${Math.floor(i/60)}`.padStart(2,'0')+':'+`${i%60}`.padStart(2,'0'));return result;}
export function timesFor(c:Config,date:string){if(c.overrides[date])return c.overrides[date].open?c.overrides[date].times:[];return c.weekly.includes(new Date(date+'T12:00:00').getDay())?generatedTimes(c):[];}
export const money=(v:number|null)=>v===null?'Sob avaliação':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
export const priceFor=(s:Service,c:Config,date:string)=>s.price===null?null:Math.round((s.price+(date.slice(5,7)==='12'&&s.decemberAdjustment!==false?(s.decemberExtra??c.adjustment):0))*100)/100;
export const dateLabel=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
export const rules=[['Reajuste em dezembro','Em dezembro, o bio humano de 4 telas recebe R$39,99 de acréscimo, totalizando R$239,98. O bio humano de 250 g mantém R$249,99 com aplicação. Os demais serviços seguem o reajuste de R$10,00.'],['Sinal para reservar','Pague R$40,00 em até 7 dias após o agendamento e sempre antes do atendimento. Envie o comprovante para análise e confirmação.'],['Tolerância de 15 minutos','Organize sua chegada para aproveitar seu horário com tranquilidade.'],['Reagendamento','Uma nova data exige o pagamento de um novo sinal.'],['Acompanhantes','Não é permitido levar acompanhante, salvo em caso de necessidade.'],['Procedimentos combinados','Informe previamente se deseja remoção, progressiva, botox, tintura ou outros serviços junto da colocação.']];

export function normalizedPhone(value:string){const n=value.replace(/\D/g,'');return n.startsWith('55')&&(n.length===12||n.length===13)?n:'55'+n;}
export function validPhone(value:string){return /^55[1-9]\d(?:9\d{8}|[2-5]\d{7})$/.test(normalizedPhone(value));}
export const whatsappLink=(phone:string)=>'https://wa.me/'+normalizedPhone(phone);
export async function tokenHash(token:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export function dayTotals(bookings:Booking[],date:string){const list=bookings.filter(b=>b.date===date&&b.status!=='cancelled');return {count:list.length,forecast:Math.round(list.reduce((s,b)=>s+(b.price??0),0)*100)/100,deposits:Math.round(list.reduce((s,b)=>s+b.paid,0)*100)/100,unpriced:list.filter(b=>b.price===null).length};}

export function upgradeConfig(raw:Config|null):Config{const c=structuredClone(raw||defaultConfig);if((c.catalogVersion??0)<2)c.services=[...defaultConfig.services,...c.services.filter(s=>!defaultConfig.services.some(d=>d.id===s.id))];if((c.catalogVersion??0)<3)c.services=c.services.map(s=>s.id==='bio'?{...s,name:'Bio humano + aplicação · 250 g',note:'5/6 telas • 250 g',price:249.99,decemberAdjustment:false}:s);if((c.catalogVersion??0)<4)c.services=c.services.map(s=>s.id==='bio4'?{...s,price:199.99,decemberAdjustment:true,decemberExtra:39.99}:s);c.catalogVersion=4;return {...defaultConfig,...c};}
