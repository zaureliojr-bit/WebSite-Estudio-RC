import React,{useEffect,useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {call} from './transport';

function fromBase64Url(base64:string){
 const padding='='.repeat((4-base64.length%4)%4);
 const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export default function PushControl(){
 const[serverKey,setServerKey]=useState(''),[supported,setSupported]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;const capable='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 setSupported(capable);
 if(capable){navigator.serviceWorker.ready.then(reg=>reg.pushManager.getSubscription()).then(sub=>{if(alive)setEnabled(!!sub)}).catch(()=>{});}call('push-config').then((v:any)=>{if(alive&&v.enabled)setServerKey(v.publicKey);else if(alive)setNotice('Servidor de notificações ainda não configurado: cadastre as chaves VAPID na Cloudflare.')}).catch(e=>{if(alive)setNotice(e instanceof Error?e.message:'Não foi possível verificar as configurações push.')});
 return()=>{alive=false}},[]);
 async function enable(){
  setBusy(true);setNotice('');
  try{
   if(!supported)throw Error('Este navegador não suporta notificações push. No iPhone, instale o site pela opção Adicionar à Tela de Início.');
   if(!serverKey)throw Error('Notificações ainda não configuradas no servidor. Configure as chaves VAPID e o banco de dispositivos, depois atualize o painel.');
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('Permissão negada. Autorize as notificações nas configurações do dispositivo.');
   const registration=await navigator.serviceWorker.ready;
   let subscription=await registration.pushManager.getSubscription();
   if(subscription){const currentKey=new Uint8Array(subscription.options.applicationServerKey||new ArrayBuffer(0));const expected=fromBase64Url(serverKey);if(currentKey.length!==expected.length||currentKey.some((v,i)=>v!==expected[i])){await subscription.unsubscribe();subscription=null;}}
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64Url(serverKey) as BufferSource});
   await call('push-subscription',{action:'subscribe',subscription:subscription.toJSON()});
   setEnabled(true);setNotice('Este dispositivo receberá avisos de novos agendamentos, mesmo com o painel fechado.');
  }catch(e){setNotice(e instanceof Error?e.message:'Não foi possível ativar as notificações.')}
  finally{setBusy(false)}
 }
 async function disable(){
  setBusy(true);setNotice('');
  try{const registration=await navigator.serviceWorker.ready,sub=await registration.pushManager.getSubscription();
   if(sub){await call('push-subscription',{action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe()}
   setEnabled(false);setNotice('Notificações desativadas neste dispositivo.');
  }catch(e){setNotice(e instanceof Error?e.message:'Falha ao desativar.')}
  finally{setBusy(false)}
 }
 return <section className="push-panel" aria-label="Notificações de novos agendamentos">
 <div><strong><Bell size={17}/> Alertas no celular</strong><p>{enabled?'Este dispositivo está inscrito para receber novos agendamentos.':'Receba uma notificação quando entrar uma nova reserva.'}</p>
 {!supported&&<small>iPhone: abra o site no Safari, toque em Compartilhar → Adicionar à Tela de Início e abra o aplicativo instalado.</small>}
 {notice&&<small role="status">{notice}</small>}</div>
 <div className="push-actions">{enabled&&<button type="button" className="secondary" disabled={busy} onClick={enable}>Sincronizar celular</button>}{enabled&&<button type="button" className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await call('push-test',{}) as {status:string;delivered?:number};setNotice(r.status==='sent'?'Notificação aceita pelo serviço push. Confira o celular.':r.status==='no_devices'?'Nenhum celular inscrito no banco. Desative e ative novamente as notificações.':r.status==='database_not_ready'?'Tabela de dispositivos não encontrada. Execute o SQL de configuração push no Supabase.':'Teste não entregue: '+r.status)}catch(e){setNotice(e instanceof Error?e.message:'Erro ao testar notificações')}finally{setBusy(false)}}}>Testar aviso</button>}<button type="button" className="secondary" disabled={busy} onClick={enabled?disable:enable}>{enabled?<><BellOff size={16}/> Desativar</>:<><Bell size={16}/> {busy?'Configurando…':'Ativar notificações'}</>}</button></div>
 </section>;
}
