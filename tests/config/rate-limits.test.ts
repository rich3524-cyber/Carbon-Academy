import { describe, expect, it } from 'vitest'
import { config as adminPosts } from '../../netlify/edge-functions/rate-limit-admin'
import { config as auth } from '../../netlify/edge-functions/rate-limit-auth'
import { config as feed } from '../../netlify/edge-functions/rate-limit-feed'
import { config as join } from '../../netlify/edge-functions/rate-limit-join'
import { config as signIn } from '../../netlify/edge-functions/rate-limit-sign-in'
import { config as verify } from '../../netlify/edge-functions/rate-limit-verify'

// Security framework controls 19 and 22: edge rate limiting on forms and auth routes.
// Server Actions POST to the page's own path, so these cover the form posts too.
describe('edge rate limits', () => {
  it.each([
    ['sign-in', signIn, ['/sign-in'], 15],
    ['join', join, ['/join', '/join/*'], 30],
    ['auth', auth, ['/auth/*'], 30],
    // Phase 5, decision 13: certificate checks and the public stores feed (T-39, T-42).
    ['verify', verify, ['/verify/*'], 30],
    ['certified stores feed', feed, ['/api/certified-stores'], 60],
    // Phase 6 (T-56): admin posts, including MFA codes.
    ['admin posts', adminPosts, ['/admin', '/admin/*'], 30],
  ])('%s is limited per IP', (_name, config, paths, limit) => {
    expect(config.path).toEqual(paths)
    expect(config.rateLimit).toEqual({
      windowLimit: limit,
      windowSize: 60,
      aggregateBy: ['ip', 'domain'],
    })
  })

  it('limits only admin form posts, not page views', () => {
    expect(adminPosts.method).toEqual(['POST'])
  })
})
