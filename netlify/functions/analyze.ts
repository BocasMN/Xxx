import type { Handler } from '@netlify/functions'

type ReqBody = {
  input?: string
}

// Função segura para extrair texto da resposta do Gemini
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
    // Só aceitar POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed'
      }
    }

    // Ler API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' })
      }
    }

    // Ler body
    const body: ReqBody = event.body ? JSON.parse(event.body) : {}
    const input = (body.input || '').trim()

    // Prompt oficial do Matchday Reality Engine
    const prompt = `
Tu és o "Matchday Reality Engine".

Objetivo:
Criar uma leitura REALISTA do jogo de HOJE, usando APENAS a informação fornecida pelo utilizador.

Regras obrigatórias:
- Não inventar estatísticas.
- Não usar histórico pesado.
- Não usar regras fixas ou sistemas.
- Não forçar decisões.
- Linguagem natural e humana.
- Máximo 2 Correct Scores realistas.
- Se os dados forem fracos, assume cenário conservador.

Formato da resposta:
Cenário tático do dia:
(texto curto e realista)

Resultados mais realistas:
- X-X
- X-X

Texto do utilizador:
${input || '(sem dados fornecidos)'}
    `.trim()

    // Endpoint correto e estável
    const url =
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`

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
        body: JSON.stringify({
          error: 'Gemini error',
          details: data
        })
      }
    }

    const text = extractText(data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text || 'Sem resposta gerada.'
      })
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message || 'Server error'
      })
    }
  }
}
