# Studio RC — e-mail e notificações no PWA

## 1. Novo agendamento no topo
O painel agora mostra uma lista "Novos agendamentos" na página Agenda e, na aba Agendamentos, exibe inicialmente todas as reservas ordenadas pela data de criação, da mais recente para a mais antiga. É possível filtrar por mês e status. Registros importados não entram no destaque "Novos agendamentos".

## 2. Diagnóstico do Resend
A API salva em cada agendamento `emailNotification.status` e o motivo da falha em `emailNotification.detail`. No painel, abra a reserva e consulte **Notificação por e-mail**. Se a notificação não foi aceita pelo Resend, clique em **Tentar enviar e-mail novamente**. O botão não dispara se o último envio já tiver sido aceito.

Verifique no Cloudflare Pages, em Production:
- `RESEND_API_KEY` — Secret, chave com permissão Sending access
- `EMAIL_FROM` — `Studio RC <agendamentos@studioraquelcandida.com.br>`
- `NOTIFICATION_EMAIL` — `raquellcandida2000@gmail.com`
- Domínio verificado no Resend
- Novo deploy após qualquer alteração nas variáveis

Também consulte os eventos em https://resend.com/emails para distinguir entrega de aceitação. O status "sent" no app significa que a API do Resend aceitou o pedido, não garante que o Gmail recebeu.

## 3. Ativar push no celular

### Supabase
Abra SQL Editor do mesmo projeto Supabase e execute **`banco-push-notificacoes.sql`** do GitHub. Ele cria uma tabela privada de inscrições para notificações.

### Cloudflare Pages
No projeto `website-estudio-rc` adicione em **Settings → Variables and Secrets → Production**:
- `VAPID_PUBLIC_KEY` — chave pública VAPID
- `VAPID_PRIVATE_KEY` — chave privada, **Secret**
- `VAPID_SUBJECT` — `mailto:raquellcandida2000@gmail.com`

As chaves públicas/privadas formam um único par P-256. Gere-as com `npx web-push generate-vapid-keys` no computador ou use o arquivo privado fornecido no chat. **Não envie a chave privada ao GitHub.** Mantenha o mesmo par após instalar o PWA.

Em **Settings → Functions → Compatibility flags**, habilite `nodejs_compat` no ambiente Production, se ainda não estiver ativo. A biblioteca de envio Web Push exige compatibilidade com Node no Cloudflare. Depois faça um novo deploy.

### No iPhone
1. Abra `https://studioraquelcandida.com.br/#admin` pelo Safari.
2. Toque em Compartilhar → Adicionar à Tela de Início.
3. Abra o ícone instalado na tela inicial e faça login.
4. Na página Agenda, toque em **Ativar notificações** e autorize.
5. Toque em **Testar aviso** para disparar uma notificação sem criar uma reserva. Depois faça um agendamento de teste por outro navegador/celular e confira se o aviso aparece mesmo com o painel fechado.

No iOS, push só está disponível para web apps instalados na tela inicial (iOS 16.4 ou posterior), com autorização da pessoa usuária. O serviço requer Internet e sistema operacional permitindo as notificações. Ao tocar no aviso, o app abre em `/#admin`.

### Diagnóstico
Se a opção "Ativar notificações" disser que faltam chaves, confira os três valores VAPID no Cloudflare e o redeploy.
Se a inscrição falhar com erro 502, confira a tabela `studio_push_subscriptions` no Supabase.
Se os avisos não chegarem, verifique o status das permissões do aplicativo no celular, a flag `nodejs_compat` e os logs da função Cloudflare. A API não armazena conteúdo da mensagem em banco, apenas subscriptions privadas.

## 4. Segurança
Somente o usuário autenticado como proprietária pode registrar/remover dispositivos. Inscrições ficam no Supabase com RLS ativa e sem permissões públicas; o backend utiliza credencial privilegiada guardada na Cloudflare. Não exponha `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ou `VAPID_PRIVATE_KEY`.
