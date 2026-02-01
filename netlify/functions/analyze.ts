import type { Handler } from '@netlify/functions'

type ReqBody = {
  input?: string
}

function extractText(data: any): string {
  try {
    return (
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join('') || ''
    )
  } catch {
    return ''
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' })
      }
    }

    const body: ReqBody = event.body ? JSON.parse(event.body) : {}
    const input = (body.input || '').trim()

    const prompt = `
Tu és o "Matchday Reality Engine".

Objetivo:
Criar uma leitura REALISTA do jogo de HOJE usando apenas os dados fornecidos.

Regras:
- Não inventar estatísticas
- Não usar histórico pesado
- Máximo 2 Correct Scores
- Linguagem humana e realista
- Se dados fracos → cenário conservador

Formato:
Cenário tático do dia:
(texto curto)

Resultados mais realistas:
- X-X
- X-X

Texto:
${input || '(sem dados)'}
    `.trim()

    // 🔴 MODELO CORRETO ATUAL
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Gemini error', details: data })
      }
    }

    const text = extractText(data)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'Server error' })
    }
  }
}
