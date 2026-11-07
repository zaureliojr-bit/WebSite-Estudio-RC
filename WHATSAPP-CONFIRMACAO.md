# Studio RC — mensagens de confirmação pelo WhatsApp

O envio é iniciado no backend **apenas quando a proprietária confirma** o agendamento no painel (após registrar o sinal). Reservas pendentes não recebem mensagem de confirmação.

## Pré-requisitos

- WhatsApp Business Platform (Cloud API) configurada na Meta, com número habilitado.
- Token de acesso do sistema e ID do número (Phone Number ID).
- Modelo (template) de mensagem **Utility** aprovado pela Meta para conversas iniciadas pela empresa.
- Consentimento da cliente: a tela de agendamento exibe um campo opcional para receber confirmação pelo WhatsApp.

## Template

Nome: `studio_agendamento_confirmado` (ou altere pela variável correspondente)
Idioma: `pt_BR`
Texto do corpo:

```text
Olá {{1}}, tudo bem? Seu horário {{2}} está confirmado!
```

Parâmetro 1 = primeiro nome da cliente.
Parâmetro 2 = dia da semana, data e horário no fuso de São Paulo. Ex.: `sábado, 07/11/2026 às 09:00`.

## Variáveis de ambiente na Netlify

- `WHATSAPP_ACCESS_TOKEN` — secreto, token da Meta (somente Functions)
- `WHATSAPP_PHONE_NUMBER_ID` — identificador do número remetente
- `WHATSAPP_CONFIRMATION_TEMPLATE` — nome do modelo aprovado (opcional: padrão `studio_agendamento_confirmado`)

Salve em Project configuration → Environment variables. Faça novo deploy após configurar.

## Observações

- Se não houver consentimento, token ou número habilitado, **nenhuma mensagem é enviada automaticamente**.
- Se a Meta rejeitar a chamada, o agendamento continua confirmado; no registro JSON, `whatsappNotification` pode indicar `failed`, `not_configured` ou `sent`.
- `sent` significa que a API da Meta aceitou o envio; não garante entrega no dispositivo. Para saber se chegou, integrar webhooks de status.
- Nunca registre tokens no GitHub, código cliente ou logs.
- Um modelo de utilidade pode exigir aprovação e estar sujeito às regras de mensagens e cobrança da Meta.
