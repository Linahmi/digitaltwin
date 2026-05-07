import { neon } from '@neondatabase/serverless'

let _sql: ReturnType<typeof neon> | null = null

function getClient(): ReturnType<typeof neon> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

const sql = new Proxy(function () {} as unknown as ReturnType<typeof neon>, {
  apply(_target, _thisArg, args) {
    return (getClient() as any).apply(null, args)
  },
  get(_target, prop) {
    const client = getClient()
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

export default sql
