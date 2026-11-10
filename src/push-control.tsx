import React,{useEffect,useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {call} from './transport';

function fromBase64Url(base64:string){
 const padding='='.repeat((4-base64.length%4)%4);
 const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export default function PushControl(){
 const[supported,setSupported]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;const capable='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 setSupported(capable);
 if(capable)navigator.serviceWorker.ready.then(reg=>reg.pushManager.getSubscription()).then(sub=>{if(alive)setEnabled(!!sub)}).catch(()=>{});
 return()=>{alive=false}},[]);
 async function enable(){
  setBusy(true);setNotice('');
  try{
   if(!supported)throw Error('Este navegador não suporta notificações push. No iPhone, instale o site pela opção Adicionar à Tela de Início.');
   const config=await call('push-config') as {enabled:boolean;publicKey:string};
   if(!config.enabled||!config.publicKey)throw Error('Notificações ainda não configuradas no servidor. Configure as chaves VAPID e o banco de dispositivos.');
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('Permissão negada. Autorize as notificações nas configurações do dispositivo.');
   const registration=await navigator.serviceWorker.ready;
   let subscription=await registration.pushManager.getSubscription();
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64Url(config.publicKey) as BufferSource});
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
 <button type="button" className="secondary" disabled={busy} onClick={enabled?disable:enable}>{enabled?<><BellOff size={16}/> Desativar</>:<><Bell size={16}/> {busy?'Configurando…':'Ativar notificações'}</>}</button>
 </section>;
}
