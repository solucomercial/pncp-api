# PNCP API

API para monitoramento e ingestão de oportunidades do PNCP.

## Variaveis de ambiente

Estas variaveis sao necessarias para a fase atual:

- `WEBHOOK_API_KEY`: chave secreta usada no header `x-api-key`
- `PNCP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_RECEIVER`

Observacao:

- `DATABASE_URL` so e necessaria quando voce for executar a etapa de banco (gerar/aplicar migration ou persistir dados de fato).

## Scripts

- `npm run dev`: ambiente de desenvolvimento
- `npm run db:generate`: gera migration SQL com Drizzle
- `npm run db:migrate`: aplica migrations no banco

## Ordem sugerida (banco por ultimo)

1. Subir API e validar contratos da rota webhook (auth + payload).
2. Integrar n8n apontando para o endpoint.
3. No final, configurar `DATABASE_URL`, gerar migration e aplicar:
   - `npm run db:generate`
   - `npm run db:migrate`

## Webhook de Oportunidades

Endpoint:

- `POST /oportunidades/webhook`

Header obrigatorio:

- `x-api-key: <WEBHOOK_API_KEY>`

Exemplo de payload:

```json
{
  "numeroControlePNCP": "123456789012340001-1-000123/2026",
  "titulo": "Contratacao de servicos terceirizados de limpeza",
  "orgao": "Prefeitura Municipal X",
  "uf": "SP",
  "municipio": "Campinas",
  "valorEstimado": 1450000.5,
  "dataPublicacao": "2026-03-13T13:00:00.000Z",
  "dataLimiteProposta": "2026-03-25T18:00:00.000Z",
  "linkEdital": "https://pncp.gov.br/exemplo",
  "objetoResumo": "Prestacao de servicos terceirizados continuados"
}
```

Comportamento:

- Se o `numeroControlePNCP` nao existir, cria registro.
- Se ja existir, atualiza o registro existente (upsert/idempotente).
