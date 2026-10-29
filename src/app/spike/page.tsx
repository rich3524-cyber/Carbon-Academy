// Phase 3 Task 2 spike (deleted after the spike)
import { connection } from 'next/server'

export const instant = false

export default async function SpikePage() {
  await connection()
  return <p>Spike rendered at {new Date().toISOString()}</p>
}
