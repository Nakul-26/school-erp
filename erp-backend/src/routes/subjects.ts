import { Hono } from 'hono'

type Bindings = { DB: D1Database }
type Variables = { college_id: string }

const subjects = new Hono<{ Bindings: Bindings, Variables: Variables }>()

subjects.get('/', async (c) => {
  const collegeId = c.get('college_id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM subjects WHERE college_id = ?'
  ).bind(collegeId).all()
  return c.json(results)
})

subjects.post('/', async (c) => {
  const collegeId = c.get('college_id')
  const { name, code } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO subjects (id, college_id, name, code) VALUES (?, ?, ?, ?)'
  ).bind(id, collegeId, name, code).run()
  return c.json({ id, message: 'Subject created' })
})

export default subjects
