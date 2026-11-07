# Migrar Studio RC da Netlify para Cloudflare Pages

Os agendamentos, usuários e comprovantes permanecem no **mesmo projeto Supabase**. Não execute novamente o SQL e não apague a Netlify antes de verificar o novo domínio.

## Cloudflare Pages

1. Acesse Cloudflare > Workers & Pages > Create application > Pages > Connect to Git.
2. Selecione GitHub, repositório `zaureliojr-bit/WebSite-Estudio-RC`, branch `main`.
3. Build command: `npm run build`
4. Output directory: `public`
5. Root directory: `/` (raiz do repositório).
6. Em **Settings > Functions**, use compatibility date `2026-11-07` (ou mais recente) e verifique que Node.js compatibility está habilitado.
7. Em **Settings > Variables and Secrets**, configure as mesmas variáveis de Production:
   - `SUPABASE_URL` — URL base do projeto, sem `/rest/v1/`
   - `SUPABASE_ANON_KEY` — chave pública legacy anon
   - `SUPABASE_SERVICE_ROLE_KEY` — **secret**, jamais incluir no GitHub
   - `OWNER_EMAIL` — e-mail da proprietária
   - Se usar avisos por e-mail: `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL`
8. Faça novo deploy após cadastrar variáveis.
9. Confira `https://SEU-PROJETO.pages.dev/.netlify/functions/api?op=availability`, login em `/#admin`, nova reserva e importação.

A compatibilidade de rotas está em `functions/.netlify/functions/api.js` que chama o mesmo handler das Netlify Functions.

A importação da agenda antiga foi preparada com validações e prevenção de duplicação de horários; execute uma única vez, depois de conferir a prévia.

O PWA deve ser reinstalado a partir do novo domínio; apps instalados no domínio antigo não mudam automaticamente.

## Antes de divulgar

Valide no novo domínio: página inicial, `/agendar`, `/confirmacao`, `/#admin`, API de disponibilidade, salvamento, login, comprovante, importação, WhatsApp e instalação do PWA. No Cloudflare Free há limites de execução, e serviços externos como Supabase têm limites próprios.
