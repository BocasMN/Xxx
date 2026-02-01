import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    // 🔐 API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
      };
    }

    // 📥 TEXTO DE ENTRADA
    const body = event.body ? JSON.parse(event.body) : {};
    const inputText = body.text || "";

    if (!inputText.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No input text provided" }),
      };
    }

    // ✅ ENDPOINT CORRETO (FUNCIONA)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // 🧠 PROMPT – Matchday Reality Engine
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `
És um analista profissional de futebol.
Analisa os dados abaixo com realismo, sem exageros e sem inventar estatísticas.

Objetivo:
- Ler o contexto do jogo
- Identificar o cenário tático mais provável
- Indicar APENAS 2 resultados finais realistas (Correct Score)

Formato da resposta (obrigatório):

Cenário tático do dia:
<descrição curta e objetiva>

Resultados mais realistas:
- X-X
- X-X

Dados:
${inputText}
              `.trim(),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 200,
      },
    };

    // 🌐 CHAMADA À API
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sem resposta do modelo.";

    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal error",
        message: err.message,
      }),
    };
  }
};
