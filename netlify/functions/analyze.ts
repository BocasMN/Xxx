// netlify/functions/analyze.ts

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function getHeader(event: any, name: string): string {
  const headers = event?.headers || {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : "";
}

function decodeBody(event: any): string {
  const raw = event?.body ?? "";
  if (!raw) return "";
  if (event?.isBase64Encoded) {
    return Buffer.from(raw, "base64").toString("utf8");
  }
  return String(raw);
}

function pickTextFromJson(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  // aceita vários nomes para não dar "No input text provided"
  return (
    obj.text ??
    obj.inputText ??
    obj.input ??
    obj.prompt ??
    obj.content ??
    obj.data ??
    ""
  );
}

const SYSTEM_PROMPT = `
És o "Matchday Reality Engine", um analista de futebol.
Com base no texto fornecido (stats, forma, tendências), devolve:

1) "Cenário tático do dia:" (1–2 linhas)
2) "Resultados mais realistas:" (máximo 2 placares, formato 1-0)

Regras:
- Não inventes estatísticas.
- Se os dados forem fracos/confusos, escolhe 2 placares conservadores e diz "Dados insuficientes" antes.
- Responde sempre em PT-PT, simples e direto.
`.trim();

// Preferências (podes mudar aqui se quiseres)
const PREFERRED_VERSIONS = ["v1", "v1beta"] as const;
const PREFERRED_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro",
] as const;

async function callGenerateContent(opts: {
  apiKey: string;
  version: string;
  model: string;
  prompt: string;
}) {
  const { apiKey, version, model, prompt } = opts;

  const url =
    `https://generativelanguage.googleapis.com/${version}` +
    `/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 400,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    err.version = version;
    err.model = model;
    throw err;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  return { text: String(text || "").trim(), raw: data };
}

async function generateWithFallback(apiKey: string, inputText: string) {
  const prompt = `${SYSTEM_PROMPT}\n\nDADOS (colar do utilizador):\n${inputText}`.trim();

  let lastErr: any = null;

  for (const version of PREFERRED_VERSIONS) {
    for (const model of PREFERRED_MODELS) {
      try {
        const out = await callGenerateContent({ apiKey, version, model, prompt });
        if (!out.text) {
          return {
            text: "Dados insuficientes.\n\nCenário tático do dia:\nJogo equilibrado, ritmo médio.\n\nResultados mais realistas:\n1-0\n0-0",
            used: { version, model, note: "empty_output_fallback" },
          };
        }
        return { text: out.text, used: { version, model } };
      } catch (e: any) {
        lastErr = e;

        // Se for erro de "model not found", tenta o próximo model.
        // Se for 401/403 (key inválida/restrita), não adianta insistir muito.
        if (e?.status === 401 || e?.status === 403) {
          throw e;
        }
        continue;
      }
    }
  }

  throw lastErr || new Error("Falhou em todos os modelos/versões.");
}

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    // Health check rápido (abre no browser)
    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      const text = String(qs.text || qs.inputText || qs.input || "").trim();

      if (!text) {
        return json(200, {
          ok: true,
          hasKey: Boolean(apiKey),
          hint: "Testa assim: /api/analyze?text=ola",
        });
      }

      if (!apiKey) return json(500, { error: "Missing GEMINI_API_KEY" });

      const result = await generateWithFallback(apiKey, text);
      return json(200, { text: result.text, used: result.used });
    }

    // POST
    const contentType = getHeader(event, "content-type");
    const bodyStr = decodeBody(event);

    let inputText = "";

    // tenta JSON
    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(bodyStr || "{}");
      inputText = String(pickTextFromJson(parsed) || "").trim();
    } else if (contentType.includes("text/plain")) {
      inputText = String(bodyStr || "").trim();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(bodyStr);
      inputText = String(
        params.get("text") ||
          params.get("inputText") ||
          params.get("input") ||
          params.get("prompt") ||
          ""
      ).trim();
    } else {
      // fallback: tenta JSON na mesma
      try {
        const parsed = JSON.parse(bodyStr || "{}");
        inputText = String(pickTextFromJson(parsed) || "").trim();
      } catch {
        inputText = String(bodyStr || "").trim();
      }
    }

    if (!apiKey) return json(500, { error: "Missing GEMINI_API_KEY" });
    if (!inputText) return json(400, { error: "No input text provided" });

    const result = await generateWithFallback(apiKey, inputText);
    return json(200, { text: result.text, used: result.used });
  } catch (err: any) {
    // devolve erro detalhado (sem expor API key)
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return json(status, {
      error: "Gemini error",
      message: String(err?.message || "Unknown error"),
      used: { version: err?.version, model: err?.model },
      details: err?.data?.error || err?.data || null,
    });
  }
};
