# Studio Raquel Cândida

Site React/Vite com Netlify Functions e Supabase.

## Publicação

Envie os arquivos de `studio-netlify/` para a raiz deste repositório (não envie a pasta externa). Depois conecte o repositório na Netlify.

- Build: `npm run build`
- Publish: `public`
- Functions: `netlify/functions`
- Node.js: `22`

## Banco de dados

Execute `banco-supabase.sql` no SQL Editor do Supabase. Configure as variáveis de ambiente na Netlify (não no GitHub): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_EMAIL`. Crie a conta de administração no Supabase Authentication.

Nunca publique chaves reais ou arquivos `.env`.
