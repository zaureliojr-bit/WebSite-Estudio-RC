# Studio RC — confirmação manual pelo WhatsApp

No painel administrativo (`/#admin`), abra o agendamento e clique em **Abrir WhatsApp com mensagem de confirmação**.

O WhatsApp abrirá a conversa da cliente com um texto preenchido:

> Olá Maria, tudo bem? Seu horário sábado, 07/11/2026 às 09:00 está confirmado!

Os dados são calculados do agendamento. Confira o texto e clique em **Enviar** no próprio WhatsApp.

**Nenhuma mensagem é enviada automaticamente.** Não é necessário configurar token, template ou API da Meta.

## App PWA do painel

- Manifesto: `/manifest.webmanifest`
- Service Worker: `/sw.js`
- Início do app: `/#admin`
- Ícone: `/rc-icon.svg`

Depois que o deploy da Netlify for publicado, acesse `https://agendamentostudiorc.netlify.app/#admin` no navegador e use **Instalar aplicativo** (Chrome/Edge) ou **Adicionar à Tela de Início** (Safari no iPhone). O painel exige conexão para entrar e salvar informações; dados de clientes não são salvos em cache pelo service worker.
