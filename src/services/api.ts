export async function analyzeToday(input: string) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || `HTTP ${res.status}`)
  }
  return res.json()
}
