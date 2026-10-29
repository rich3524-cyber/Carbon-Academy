import { getCertifiedStores } from '@/lib/certificates/data'

// Public, read-only GET (PRD 5.5, control 08): store fields only, cached for an hour, no CORS.
export async function GET() {
  const stores = await getCertifiedStores()
  return Response.json(
    { stores },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
  )
}
