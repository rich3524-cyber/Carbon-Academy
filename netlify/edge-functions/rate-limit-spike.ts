// Phase 3 Task 2 spike (deleted after the spike)
// Local types keep @netlify/edge-functions out of package.json (no new dependency).
type Context = { next: () => Promise<Response> }

export default async (_request: Request, context: Context) => context.next()

export const config = {
  path: '/spike',
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
