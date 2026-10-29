import { describe, expect, it } from 'vitest'
import { config as auth } from '../../netlify/edge-functions/rate-limit-auth'
import { config as join } from '../../netlify/edge-functions/rate-limit-join'
import { config as signIn } from '../../netlify/edge-functions/rate-limit-sign-in'

// Security framework controls 19 and 22: edge rate limiting on forms and auth routes.
// Server Actions POST to the page's own path, so these cover the form posts too.
describe('edge rate limits', () => {
  it.each([
    ['sign-in', signIn, ['/sign-in'], 15],
    ['join', join, ['/join', '/join/*'], 30],
    ['auth', auth, ['/auth/*'], 30],
  ])('%s is limited per IP', (_name, config, paths, limit) => {
    expect(config.path).toEqual(paths)
    expect(config.rateLimit).toEqual({
      windowLimit: limit,
      windowSize: 60,
      aggregateBy: ['ip', 'domain'],
    })
  })
})
