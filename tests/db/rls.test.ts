import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'

// Security framework control 04: deny by default, verified server-side against a real database.

let draftLessonId: string | undefined

beforeAll(async () => {
  const { data: category, error: categoryError } = await admin
    .from('categories')
    .select('id')
    .eq('slug', 'winches')
    .single()
  if (categoryError) throw categoryError

  const { data, error } = await admin
    .from('lessons')
    .insert({
      category_id: category.id,
      slug: 'rls-test-draft',
      title: '[TEST] Draft lesson',
      published: false,
    })
    .select('id')
    .single()
  if (error) throw error
  draftLessonId = data.id
})

afterAll(async () => {
  if (draftLessonId) await admin.from('lessons').delete().eq('id', draftLessonId)
})

describe('lessons', () => {
  it('hides unpublished lessons from the publishable key', async () => {
    const { data, error } = await publicClient.from('lessons').select('id').eq('id', draftLessonId!)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('shows published lessons to the publishable key', async () => {
    const { data, error } = await publicClient
      .from('lessons')
      .select('slug')
      .eq('slug', 'scout-pro-10k-v3')
    expect(error).toBeNull()
    expect(data).toEqual([{ slug: 'scout-pro-10k-v3' }])
  })

  it('leaves unpublished lessons out of embedded counts', async () => {
    const { data, error } = await publicClient
      .from('categories')
      .select('slug, lessons(count)')
      .eq('slug', 'winches')
      .single()
    expect(error).toBeNull()
    expect(data?.lessons).toEqual([{ count: 7 }])
  })
})

describe('seed', () => {
  it('has 5 categories and 15 published placeholder lessons', async () => {
    const categories = await publicClient.from('categories').select('slug')
    const lessons = await publicClient.from('lessons').select('slug, is_core')
    expect(categories.data).toHaveLength(5)
    expect(lessons.data).toHaveLength(15)
    expect(lessons.data?.filter((lesson) => lesson.is_core)).toHaveLength(9)
  })
})

describe('write protection for the publishable key', () => {
  it('cannot insert categories', async () => {
    const { error } = await publicClient
      .from('categories')
      .insert({ slug: 'rls-test', name: 'RLS test' })
    expect(error).not.toBeNull()
  })

  it('cannot update lessons', async () => {
    const { error } = await publicClient
      .from('lessons')
      .update({ title: 'Changed' })
      .eq('slug', 'scout-pro-10k-v3')
    expect(error).not.toBeNull()
  })

  it('cannot change settings', async () => {
    const { error } = await publicClient
      .from('settings')
      .update({ value: 0 })
      .eq('key', 'pass_mark_percent')
    expect(error).not.toBeNull()
  })

  it('can read settings', async () => {
    const { data, error } = await publicClient
      .from('settings')
      .select('value')
      .eq('key', 'store_certification_threshold')
      .single()
    expect(error).toBeNull()
    expect(data?.value).toBe(2)
  })
})
