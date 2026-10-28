import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'

// Security framework controls 04, 06, 12, 22: QR tables are closed to the publishable key and
// scans are recorded only through log_qr_scan(), which validates input and caps recording.

let draftLessonId: string | undefined
let draftLinkId: string | undefined
let capLinkId: string | undefined

beforeAll(async () => {
  const { data: winches, error: categoryError } = await admin
    .from('categories')
    .select('id')
    .eq('slug', 'winches')
    .single()
  if (categoryError) throw categoryError
  const { data: lesson, error: lessonError } = await admin
    .from('lessons')
    .insert({
      category_id: winches.id,
      slug: 'qr-test-draft',
      title: '[TEST] Draft',
      published: false,
    })
    .select('id')
    .single()
  if (lessonError) throw lessonError
  draftLessonId = lesson.id
  const { data: draftLink, error: draftLinkError } = await admin
    .from('qr_links')
    .insert({ slug: 'qr-test-draft', lesson_id: draftLessonId })
    .select('id')
    .single()
  if (draftLinkError) throw draftLinkError
  draftLinkId = draftLink.id
  const { data: published, error: publishedError } = await admin
    .from('lessons')
    .select('id')
    .eq('slug', 'scout-pro-10k-v3')
    .single()
  if (publishedError) throw publishedError
  const { data: capLink, error: capLinkError } = await admin
    .from('qr_links')
    .insert({ slug: 'qr-test-cap', lesson_id: published.id })
    .select('id')
    .single()
  if (capLinkError) throw capLinkError
  capLinkId = capLink.id
})

afterAll(async () => {
  for (const id of [draftLinkId, capLinkId]) {
    if (id) await admin.from('qr_links').delete().eq('id', id)
  }
  if (draftLessonId) await admin.from('lessons').delete().eq('id', draftLessonId)
})

describe('QR tables (control 04)', () => {
  it('are not readable with the publishable key', async () => {
    expect((await publicClient.from('qr_links').select('slug')).error).not.toBeNull()
    expect((await publicClient.from('qr_scans').select('id')).error).not.toBeNull()
  })

  it('are not writable with the publishable key', async () => {
    const { error } = await publicClient
      .from('qr_links')
      .insert({ slug: 'x', lesson_id: draftLessonId! })
    expect(error).not.toBeNull()
  })
})

describe('log_qr_scan', () => {
  it('returns the lesson target and records the scan with its UTMs', async () => {
    const before = await admin
      .from('qr_links')
      .select('scan_count')
      .eq('slug', 'test-slug')
      .single()
    const { data, error } = await publicClient
      .rpc('log_qr_scan', { p_slug: 'test-slug', p_utm_source: 'packaging', p_utm_medium: 'qr' })
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toEqual({ category_slug: 'winches', lesson_slug: 'scout-pro-10k-v3' })
    const after = await admin
      .from('qr_links')
      .select('id, scan_count')
      .eq('slug', 'test-slug')
      .single()
    expect(after.data!.scan_count).toBe(before.data!.scan_count + 1)
    const scan = await admin
      .from('qr_scans')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('qr_link_id', after.data!.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()
    expect(scan.data).toEqual({ utm_source: 'packaging', utm_medium: 'qr', utm_campaign: null })
  })

  it.each([['no-such-slug'], ['Bad Slug'], ["x';drop table lessons;--"]])(
    'returns nothing for %s',
    async (slug) => {
      const { data, error } = await publicClient.rpc('log_qr_scan', { p_slug: slug }).maybeSingle()
      expect(error).toBeNull()
      expect(data).toBeNull()
    },
  )

  it('returns nothing for a link to an unpublished lesson', async () => {
    const { data } = await publicClient
      .rpc('log_qr_scan', { p_slug: 'qr-test-draft' })
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('truncates UTM values to 100 characters', async () => {
    await publicClient.rpc('log_qr_scan', {
      p_slug: 'qr-test-cap',
      p_utm_campaign: 'a'.repeat(300),
    })
    const scan = await admin
      .from('qr_scans')
      .select('utm_campaign')
      .eq('qr_link_id', capLinkId!)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()
    expect(scan.data!.utm_campaign).toHaveLength(100)
  })

  it('records at most 60 scans per link per minute but still returns the target (control 22)', async () => {
    for (let i = 0; i < 65; i++) await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-cap' })
    const { count } = await admin
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('qr_link_id', capLinkId!)
    expect(count).toBe(60)
    const { data } = await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-cap' }).maybeSingle()
    expect(data).toEqual({ category_slug: 'winches', lesson_slug: 'scout-pro-10k-v3' })
  })
})
