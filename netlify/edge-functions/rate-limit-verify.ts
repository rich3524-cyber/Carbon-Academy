// Netlify enforces config.rateLimit before the function runs (429 when over the limit).
// Certificate checks (plan decision 13, T-39): slows anyone stepping through numbers.
type Context = { next: () => Promise<Response> }

export default function rateLimitVerify(_request: Request, context: Context) {
  return context.next()
}

export const config = {
  path: ['/verify/*'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
