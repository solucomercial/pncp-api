import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

let dbInstance: ReturnType<typeof drizzle> | null = null

export const getDb = () => {
  if (dbInstance) {
    return dbInstance
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to use oportunidades webhook')
  }

  const pool = new Pool({
    connectionString,
  })

  dbInstance = drizzle({ client: pool })
  return dbInstance
}
