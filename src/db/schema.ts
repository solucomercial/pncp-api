import {
  bigint,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const oportunidadeStatusEnum = pgEnum('oportunidade_status', [
  'NOVO',
  'EM_ANALISE',
  'DECLINADO',
  'APROVADO_PROPOSTA',
])

export const oportunidades = pgTable(
  'oportunidades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    numeroControlePNCP: varchar('numero_controle_pncp', { length: 120 })
      .notNull()
      .unique(),
    titulo: text('titulo').notNull(),
    orgao: text('orgao').notNull(),
    uf: varchar('uf', { length: 2 }),
    municipio: text('municipio'),
    valorEstimado: numeric('valor_estimado', { precision: 15, scale: 2 }),
    dataPublicacao: timestamp('data_publicacao', { withTimezone: true }),
    dataLimiteProposta: timestamp('data_limite_proposta', {
      withTimezone: true,
    }),
    statusInterno: oportunidadeStatusEnum('status_interno')
      .notNull()
      .default('NOVO'),
    linkEdital: text('link_edital'),
    objetoResumo: text('objeto_resumo'),
    fonte: varchar('fonte', { length: 50 }).notNull().default('n8n'),
    payloadBruto: jsonb('payload_bruto').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    versaoIngestao: bigint('versao_ingestao', { mode: 'number' })
      .notNull()
      .default(1),
  },
  (table) => [
    index('oportunidades_status_idx').on(table.statusInterno),
    index('oportunidades_data_publicacao_idx').on(table.dataPublicacao),
    index('oportunidades_data_limite_proposta_idx').on(table.dataLimiteProposta),
  ],
)

export type Oportunidade = typeof oportunidades.$inferSelect
export type NewOportunidade = typeof oportunidades.$inferInsert
