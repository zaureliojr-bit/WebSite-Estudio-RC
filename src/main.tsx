import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './transport';
import {call,setToken} from './transport';
import Client from './client';
import Admin from './admin';
import './styles.css';
const demo=!!(window as any).STUDIO_DEMO;
function App(){const[admin,setAdmin]=useState(location.hash==='#admin'),[logged,setLogged]=useState(false),[checking,setChecking]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[emailReady,setEmailReady]=useState(false);
useEffect(()=>{const fn=()=>setAdmin(location.hash==='#admin');addEventListener('hashchange',fn);return()=>removeEventListener('hashchange',fn)},[]);
useEffect(()=>{if(!admin)return;if(demo){setLogged(true);return}setChecking(true);window.fetch('/api/studio').then(async r=>{if(!r.ok){setLogged(false);setToken('');return}const d=await r.json();setLogged(true);setEmailReady(!!d.emailReady)}).catch(()=>setLogged(false)).finally(()=>setChecking(false))},[admin]);
async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const d=await call('login',{email,password});setToken(d.access_token);setPassword('');setLogged(true);setEmailReady(!!d.emailReady)}catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.')}finally{setBusy(false)}}
return <>{demo&&<div className="export-banner"><strong>DEMONSTRAÇÃO DO CODEPEN</strong> · Nada é enviado ou salvo no studio. Os dados somem ao recarregar. <a href="#admin">Testar painel</a></div>}{admin?<>{checking?<div className="loading">Verificando acesso…</div>:logged?<><div className="export-toolbar"><a href="#">Ver tela da cliente</a><span>{demo?'Demonstração':emailReady?'Avisos por e-mail conectados':'Avisos por e-mail não configurados'}</span><button onClick={()=>{setToken('');setLogged(false)}}>Sair da gestão</button></div><Admin/></>:<main className="export-login"><a href="#">← Voltar ao agendamento</a><h1>Área do studio</h1><p>Entre com a conta da proprietária.</p>{error&&<div className="client-error">{error}</div>}<form onSubmit={login}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="client-primary client-wide" disabled={busy}>{busy?'Entrando…':'Entrar na gestão'}</button></form><small>Acesso real exige a configuração do Supabase descrita no guia do pacote.</small></main>}</>:<Client/>}</>}
createRoot(document.getElementById('root')!).render(<App/>);
