// Netlify enforces config.rateLimit before the function runs (429 when over the limit).
// The public certified stores feed (plan decision 13, T-42).
type Context = { next: () => Promise<Response> }

export default function rateLimitFeed(_request: Request, context: Context) {
  return context.next()
}

export const config = {
  path: ['/api/certified-stores'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
