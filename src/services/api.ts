export async function analyzeToday() {
  const res = await fetch('/api/analyze', { method: 'POST' })
  return res.json()
}
