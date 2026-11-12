# Teste controlado das notificações Push — Studio RC

## Segurança
- Produção permanece na branch `main`.
- Ponto de restauração: `restauracao/studio-rc-estavel-2026-11-12`, commit `039effe72f529101aea6028dbb53ea3296823497`.
- Este desenvolvimento substitui o pacote Node `web-push` por `@block65/webcrypto-web-push@2.0.0`, baseado em Web Crypto (Cloudflare Workers).
- Não cadastre chaves VAPID no GitHub. Utilize **Variables and secrets** na Cloudflare para o ambiente do teste.
- Sem as chaves VAPID ou a tabela de dispositivos, o envio push retorna um status informativo e **não impede que um agendamento seja salvo ou enviado por e-mail**.

## Preparar
1. No Supabase, execute `push-supabase.sql` (somente uma vez). Isso cria `studio_push_subscriptions`.
2. Gere um par VAPID válido em um ambiente local seguro: `npx web-push generate-vapid-keys`.
3. Configure no ambiente de Preview (ou no ambiente separado de teste) da Cloudflare Pages:
   - `VAPID_PUBLIC_KEY` (texto): chave pública
   - `VAPID_PRIVATE_KEY` (secret): chave privada
   - `VAPID_SUBJECT` (texto): `mailto:raquellcandida2000@gmail.com`
   - As variáveis Supabase requeridas também precisam estar presentes no ambiente de teste.
4. Instale o PWA no iPhone (Safari → Compartilhar → Adicionar à Tela de Início); abra pelo **ícone instalado**. No Android, abra o PWA compatível.
5. No painel, use `Ativar notificações` ou `Sincronizar celular`; aceite a permissão e toque em `Testar aviso`.

## Antes de levar a produção
- Validar compilação da Pages Function no Preview;
- Verificar que `push-config` indica chaves presentes;
- Verificar inscrição em `studio_push_subscriptions` no Supabase;
- Confirmar `push-test` status `sent` e aviso visível no aparelho;
- Confirmar que novo agendamento envia e-mail e push sem duplicidade;
- Confirmar login, serviços, calendário, horários e reserva no ambiente de produção **após** aprovação para mesclar.

## Atenção
Chaves VAPID existentes devem ser mantidas para não invalidar as assinaturas dos celulares. A biblioteca não depende dos módulos Node http/https/crypto.
