import type { Handler } from '@netlify/functions'

type AnalyzeReq = {
  input?: string
}

function pickText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts
  if (Array.isArray(parts)) return parts.map((p: any) => p?.text).filter(Boolean).join('')
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' }) }
    }

    const body: AnalyzeReq = event.body ? JSON.parse(event.body) : {}
    const input = (body.input || '').trim()

    const systemPrompt = `
Tu és o "Matchday Reality Engine".
Baseia-te APENAS no texto fornecido pelo utilizador (dados de hoje).
Não inventes estatísticas ou factos que não estejam no texto.

Objetivo de saída (em PORTUGUÊS):
Devolve um JSON com esta estrutura EXATA:
{
  "tactical": "parágrafo curto (3-6 linhas)",
  "factors": ["3 a 6 bullets curtos e concretos (sem inventar)"],
  "realisticResults": [
    {"score":"1-0","label":"CENÁRIO BASE","why":"1-2 frases"},
    {"score":"0-0","label":"CENÁRIO ALTERNATIVO","why":"1-2 frases"}
  ]
}

Regras:
- "realisticResults" deve ter no máximo 2 itens.
- Se não houver dados suficientes, assume um jogo conservador e diz o que faltou em "factors".
- Não uses palavreado de tipster. Sê realista, técnico e simples.
    `.trim()

    const userText = input || '(sem texto)'
    const prompt = `${systemPrompt}\n\nTEXTO DO UTILIZADOR:\n${userText}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 700
        }
      })
    })

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      return {
        statusCode: geminiRes.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gemini error', details: data })
      }
    }

    const raw = pickText(data).trim()

    // Gemini vai devolver JSON em texto; tentamos parse.
    let parsed: any = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      // fallback: devolve texto cru
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tactical: raw,
          factors: ['Saída não veio em JSON. Ajustar prompt se necessário.'],
          realisticResults: [{ score: '1-0', label: 'CENÁRIO BASE', why: 'Fallback conservador.' }]
        })
      }
    }

    // Normalização mínima
    const tactical = String(parsed?.tactical || '').trim()
    const factors = Array.isArray(parsed?.factors) ? parsed.factors.map((x: any) => String(x)) : []
    const realisticResults = Array.isArray(parsed?.realisticResults) ? parsed.realisticResults.slice(0, 2) : []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tactical, factors, realisticResults })
    }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Server error' }) }
  }
}
