import type { Handler } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ MODELO ATUAL E SUPORTADO
const MODEL = "gemini-1.5-flash";

// ✅ API v1beta (OBRIGATÓRIO)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export const handler: Handler = async (event) => {
  try {
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const text = body.text;

    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No input text provided" }),
      };
    }

    const prompt = `
És um analista profissional de futebol.
Cria uma análise REALISTA do jogo com base nos dados.

Inclui:
- Cenário tático
- Ritmo do jogo
- Máximo 2 resultados prováveis

DADOS:
${text}
`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Gemini error",
          details: data,
        }),
      };
    }

    const output =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sem resposta do modelo.";

    return {
      statusCode: 200,
      body: JSON.stringify({ text: output }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: err.message,
      }),
    };
  }
};
