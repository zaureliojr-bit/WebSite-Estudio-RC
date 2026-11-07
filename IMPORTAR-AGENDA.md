# Importação da agenda antiga — Studio RC

O painel administrativo em `/#admin` contém **Agendamentos → Importar agenda**.

1. Entre na conta de administração do Studio RC.
2. Abra **Agendamentos** e clique em **Importar agenda**.
3. Escolha um dos arquivos de backup da agenda antiga (`agendamentos.json`, `agendamentos.csv` ou `agendamentos_excel.csv`).
4. Confira a prévia dos registros e clique em **Confirmar importação**.
5. O sistema retorna quantos registros foram importados e quais horários foram ignorados por conflito. Confira os meses de novembro e dezembro de 2026.

O arquivo JSON é o recomendado. **Importe uma única vez, não os três arquivos**, pois contêm a mesma agenda.

## Segurança e integridade
- Só a conta administrativa autenticada consegue importar.
- O banco utiliza unicidade de horário e a importação **não sobrescreve** reservas preexistentes.
- Datas e horários do arquivo são preservados. Horários originais diferentes são adicionados às observações.
- Valores não informados permanecem como `null` (sob avaliação).
- Telefones ausentes permanecem vazios. Não invente números.
- Todos os novos itens entram com status `pending` e sinal recebido `0`, pois a fonte não confirma pagamento.
- Registros na agenda antiga podem cair em dias atualmente fechados; devem ser revisados.
- Por privacidade, **não envie arquivos de clientes para o GitHub**. Selecione o arquivo localmente no painel PWA; o backend protegido envia os registros ao Supabase.

## Observações do pacote recebido
O material contém 50 compromissos, com horários ajustados. Alguns dados exigem revisão, incluindo telefone incompleto, valor ausente, duplicidades aparentes de nomes e bloqueios de dias. O sistema não deduz durações não informadas. A própria fonte alerta que o período não está necessariamente completo.
