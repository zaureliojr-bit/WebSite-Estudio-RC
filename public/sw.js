const CACHE='studio-rc-shell-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/rc-icon.svg','/manifest.webmanifest'])));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')||u.pathname.includes('/auth/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(async()=>{const cached=await caches.match('/');return cached||Response.error()}));return}
event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)))
});

self.addEventListener('push',event=>{
 let data={title:'Novo agendamento · Studio RC',body:'Uma nova cliente reservou um horário.',url:'/#admin'};
 try{if(event.data)data={...data,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{
   body:data.body,icon:'/rc-icon.svg',badge:'/rc-icon.svg',tag:'studio-rc-nova-reserva',renotify:true,
   data:{url:data.url||'/#admin'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'/#admin',self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(client=>client.url.startsWith(self.location.origin));
  if(existing){await existing.navigate(url);return existing.focus()}
  return self.clients.openWindow(url)
 }));
});
