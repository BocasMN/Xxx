import type { Handler } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  // Preflight (CORS)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Health check (para abrires no browser e veres que está vivo)
  if (event.httpMethod === "GET") {
    return json(200, {
      ok: true,
      hint: 'Usa POST em /api/analyze com JSON { "text": "..." }',
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Missing GEMINI_API_KEY" });
  }

  // Aceita vários nomes para não dar “No input…”
  let body: any = null;
  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const text =
    (typeof body === "string" ? body : null) ??
    body?.text ??
    body?.inputText ??
    body?.input ??
    body?.prompt ??
    body?.content ??
