// Netlify enforces config.rateLimit before the function runs (429 when over the limit).
// Local types keep @netlify/edge-functions out of package.json.
type Context = { next: () => Promise<Response> }

export default function rateLimitAuth(_request: Request, context: Context) {
  return context.next()
}

export const config = {
  path: ['/auth/*'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
