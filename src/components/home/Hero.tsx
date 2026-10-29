import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import texture from '../../../public/brand/concrete-texture.jpg'

/**
 * Master wrap texture with a 60% Carbon Black overlay, so white text stays at 6.1:1 or better
 * (BRAND.md concrete texture). It's this screen's one slash motif (p.32). No logo on the
 * texture and no cyan text over it: cyan would drop to about 2.1:1 on the lightest patches.
 * A card-cornered banner inside the page width, like the website's (BRAND.md Website style).
 */
// Draft copy, awaiting Rich's approval (brand p.69).
export function Hero() {
  return (
    <Container className="pt-6 md:pt-8">
      <section
        data-surface="dark"
        className="relative isolate overflow-hidden rounded-card bg-carbon-black text-white"
      >
        <Image
          src={texture}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="-z-20 object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-carbon-black/60" />
        <div className="px-6 py-14 md:px-12 md:py-24">
          <h1 className="max-w-3xl text-h1 md:text-h1-lg">Know your gear. Get home safe.</h1>
          <p className="mt-4 max-w-prose md:text-body-lg">
            Short videos on fitting, using and looking after your Carbon Offroad gear. Watch for
            free. Store staff who pass the core lesson quizzes become Carbon Certified.
          </p>
          <div className="mt-8">
            <ButtonLink href="/lessons">Browse lessons</ButtonLink>
          </div>
        </div>
      </section>
    </Container>
  )
}
