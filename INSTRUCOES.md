# Studio Raquel Cândida — CodePen e Netlify

O pacote contém a agenda em vermelho, uma tela simples para as clientes e a área de gestão com login. As clientes não veem contagem de vagas, sinais de outras clientes nem faturamento. Nome, WhatsApp com DDD e cor são obrigatórios. O painel da proprietária inclui link direto para o WhatsApp e o valor previsto dos procedimentos do dia.

## 1. Visualizar no CodePen

1. Abra um novo Pen em https://codepen.io/pen/.
2. Abra `codepen/cole-no-codepen.html` em um editor de texto e copie o arquivo inteiro.
3. Cole tudo no painel HTML. Deixe os painéis CSS e JS vazios, sem preprocessadores.
4. A prévia já contém os estilos e o JavaScript. Use “Área do studio” para testar o painel.

**É uma demonstração:** nenhum agendamento é enviado ao studio ou salvo em banco. Os dados de teste somem ao recarregar. O envio de comprovantes, e-mails e o login real não funcionam no CodePen. Não use a demonstração para receber agendamentos de clientes.

Você também pode abrir `codepen/cole-no-codepen.html` diretamente no navegador para visualizar a demonstração.

## 2. Preparar o banco para a Netlify

A versão real usa Supabase para salvar agendamentos e comprovantes e validar o login da proprietária. A Netlify hospeda o site e as funções que acessam esse banco. Não é o banco do site anterior.

1. Crie um projeto em https://supabase.com/dashboard.
2. No SQL Editor, execute o conteúdo de `banco-supabase.sql` uma vez.
3. Em Authentication → Users, crie a conta da proprietária com o e-mail que você usará em `OWNER_EMAIL`, uma senha definida por você e o e-mail confirmado. Não há cadastro público de administradoras no site.
4. Desative cadastros públicos em Authentication se não precisar deles.
5. Nas configurações/API do projeto, copie a URL do projeto, a chave pública `anon` (ou publishable) e a chave de servidor `service_role` (ou secret). Os nomes na interface podem variar.
6. O SQL cria um bucket **privado** chamado `studio-receipts`. Mantenha o bucket privado e não crie políticas de leitura pública para ele ou para as tabelas.

A chave de servidor fica apenas nas variáveis da Netlify. Não cole a chave no HTML, CodePen, GitHub, `src/` ou em mensagens públicas.

## 3. Configurar a Netlify

**Para o site completo, use importação por Git ou a CLI. Apenas arrastar o HTML/ZIP no Netlify Drop não instala as funções do agendamento.**

### Opção A — GitHub + Netlify

1. Extraia o ZIP.
2. Envie o conteúdo da pasta `studio-netlify` para a raiz de um repositório GitHub, incluindo `netlify.toml`, `package.json`, `src`, `server`, `netlify`, `scripts.mjs` e os demais arquivos.
3. Na Netlify, escolha criar/importar um projeto a partir desse repositório.
4. Use estas configurações, já declaradas em `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
   - Node: 22
5. Em Environment variables, cadastre as variáveis abaixo com disponibilidade para **Functions**. Use os valores do seu projeto. Não adicione o prefixo `VITE_` às chaves secretas.

| Variável | Conteúdo |
| --- | --- |
| `SUPABASE_URL` | URL do seu projeto, por exemplo `https://seu-projeto.supabase.co` |
| `SUPABASE_ANON_KEY` | Chave pública anon ou publishable do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role ou secret, somente no servidor |
| `OWNER_EMAIL` | E-mail confirmado da conta da proprietária criada no Supabase |
| `RESEND_API_KEY` | Opcional: chave do Resend para avisos por e-mail |
| `EMAIL_FROM` | Opcional: remetente autorizado/verificado no Resend |
| `NOTIFICATION_EMAIL` | Opcional: endereço que recebe os avisos; se vazio, usa `OWNER_EMAIL` |

6. Faça um novo deploy depois de configurar as variáveis.
7. Abra a URL da Netlify. A tela inicial é o agendamento das clientes. A gestão fica em `/#admin`, com o e-mail e a senha criados no Supabase.

Não publique um arquivo `.env` com valores reais. O `.env.example` incluído tem apenas campos de exemplo.

### Opção B — CLI no computador

Dentro da pasta `studio-netlify`, com Node 22 instalado:

```sh
npm install
npx netlify login
npx netlify init
```

Configure as variáveis no painel da Netlify e publique:

```sh
npx netlify deploy --build --prod
```

Para executar os testes locais do pacote:

```sh
npm test
```

Para desenvolver com funções localmente, use `npx netlify dev` depois de vincular/configurar o projeto. `npm run dev` abre somente a interface Vite e não substitui as funções da Netlify.

## 4. Avisos por e-mail

Os avisos de novos agendamentos estão preparados para o Resend (https://resend.com). Para ativá-los, configure `RESEND_API_KEY`, `EMAIL_FROM` e, se desejar, `NOTIFICATION_EMAIL` nas variáveis da Netlify. O remetente precisa estar autorizado no Resend. Depois, faça novo deploy.

Sem essas variáveis, o agendamento funciona e é salvo, mas não envia e-mail. O painel informa que os avisos não estão configurados. Esta entrega não inclui uma conta de envio nem confirma entrega real de e-mails; isso depende da sua configuração.

## 5. Como usar

### Clientes

Selecionam serviço, data e horário. Depois informam nome, WhatsApp com DDD, cor e observações, leem as regras e registram o pedido. A reserva ocupa o horário e fica aguardando o sinal. Só veem os dados do próprio pedido.

As instruções para pagar o sinal de R$40,00 e a chave PIX `11910326254` aparecem no pedido individual. O resumo dos sinais e o faturamento são exclusivos da gestão.

O comprovante pode ser JPG, PNG ou PDF, de até **3 MB**. A tela permite enviar o comprovante após registrar o pedido enquanto o pedido continua aberto naquela página. Se a cliente fechar a página, envie o comprovante ao studio por WhatsApp para você anexar na gestão; não há portal de recuperação da reserva por telefone.

### Proprietária

Entre em “Área do studio”. No calendário, selecione o dia. Em “Editar dia”, abra/feche o atendimento e ajuste os horários, inclusive domingos. Nas configurações, ajuste os dias da semana, início, fim e intervalo padrão. Reservas existentes não são apagadas ao fechar um dia.

Em “Serviços e valores”, edite os preços. O acréscimo de dezembro é somado uma vez aos demais procedimentos/combinações. O bio humano de 250 g com aplicação mantém R$249,99, inclusive em dezembro. Na reserva, confira o comprovante e registre o sinal antes de confirmar. Clique em “Abrir WhatsApp da cliente” para conversar pelo número informado.

O total previsto do dia soma procedimentos de reservas ativas. Não é a soma dos pagamentos já recebidos. Reservas canceladas ficam fora dessa previsão. Valores “sob avaliação” não entram no total até existir um preço registrado. O reagendamento libera a data anterior e cria uma nova reserva com novo sinal.

A senha é gerenciada no Supabase, não no CodePen. A sessão usa um token temporário de autenticação; se expirar, saia e entre novamente.

## 6. Conteúdo do pacote

- `public/index.html`: interface pronta para a Netlify.
- `codepen/cole-no-codepen.html`: demonstração independente para o CodePen.
- `src/`: código editável da interface.
- `netlify/functions/api.mjs`: funções para agenda, login, PIX/comprovantes e avisos.
- `server/studio.ts`: serviços, preços iniciais e regras compartilhadas com o servidor.
- `banco-supabase.sql`: tabelas privadas, armazenamento privado e operação de reagendamento.
- `netlify.toml`: configuração de build e funções.
- `tests/api.test.mjs`: testes com serviços simulados, sem dados de clientes.
- `.env.example`: nomes das variáveis de configuração, sem chaves reais.

**Depois de editar `src/` ou estilos, execute `npm run build`** ou deixe o build da Netlify atualizar o HTML publicado. O arquivo da demonstração também é regenerado pelo build.

## 7. O que está e o que não está transferido

O pacote não contém dados de clientes, comprovantes existentes, senhas ou chaves. Os agendamentos do site anterior não são migrados automaticamente. O site anterior permanece onde estava; esta entrega fornece arquivos para uma hospedagem separada. Também não inclui a foto da criança.

Foram verificados o build e testes de autorização, WhatsApp obrigatório, respostas públicas sem dados internos, horários duplicados, confirmação do sinal e acesso a comprovantes. O deploy na sua conta Netlify, o banco real, o login real, a transação SQL no seu Supabase e a entrega de e-mails ainda precisam ser verificados após a configuração.

## Referências oficiais

- Netlify Functions: https://docs.netlify.com/build/functions/get-started/
- Configuração Netlify: https://docs.netlify.com/build/configure-builds/file-based-configuration/
- Usuários Supabase: https://supabase.com/docs/guides/auth/managing-user-data
- Chaves Supabase: https://supabase.com/docs/guides/api/api-keys
- Resend: https://resend.com/docs/api-reference/emails/send-email

## Atualização de apresentação

As quatro fotos enviadas pela proprietária estão incluídas no layout, junto da apresentação do Studio, dos serviços e da explicação de bio humano e fibra russa. Os textos estão em `src/studio-presentation.tsx`, os estilos em `src/styles.css` e as imagens incorporadas em `src/studio-photos.ts`. O CodePen continua sendo apenas demonstração.

Endereço exibido próximo ao agendamento: Praça Dezoito do Forte, 17, sala 8, Centro, Santo André – SP.

Dezembro: bio humano 4 telas tem acréscimo de R$39,99 sobre R$199,99, totalizando R$239,98. Bio humano 250 g mantém R$249,99.
