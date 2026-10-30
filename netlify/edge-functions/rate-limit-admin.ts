// Netlify enforces config.rateLimit before the function runs (429 when over the limit).
// Phase 6 (T-56): admin form posts, including MFA codes, are limited per IP. Page views aren't.
type Context = { next: () => Promise<Response> }

export default function rateLimitAdmin(_request: Request, context: Context) {
  return context.next()
}

export const config = {
  path: ['/admin', '/admin/*'],
  method: ['POST'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
