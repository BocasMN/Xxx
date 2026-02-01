import { useState } from "react";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    if (!inputText.trim()) {
      setError("Insere texto para análise.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText, // ✅ AQUI ESTÁ A CHAVE
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro desconhecido");
      }

      setResult(data.text || "Sem resposta do modelo.");
    } catch (err: any) {
      setError(err.message || "Erro ao contactar o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>Matchday Reality Engine</h1>

      <h3>Dados de entrada</h3>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={10}
        style={{ width: "100%", padding: 10 }}
        placeholder="Cola aqui os dados do jogo..."
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={handleAnalyze} disabled={loading}>
          ⚡ Gerar Leitura de HOJE
        </button>
        <button onClick={handleClear} style={{ marginLeft: 10 }}>
          Limpar
        </button>
      </div>

      {loading && <p>A analisar…</p>}

      {error && (
        <pre style={{ color: "red", marginTop: 20 }}>{error}</pre>
      )}

      {result && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
          {result}
        </pre>
      )}
    </div>
  );
}
