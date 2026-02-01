import { useEffect, useMemo, useState } from 'react'
import { analyzeToday } from '../services/api'

type ResultItem = { score: string; label: string; why: string }
type Analysis = { tactical: string; factors: string[]; realisticResults: ResultItem[] }

const LS_KEY = 'lastAnalysis_v1'

function Card({ children }: { children: any }) {
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 14
      }}
    >
      {children}
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.10)',
        opacity: 0.9
      }}
    >
      {text}
    </span>
  )
}

export default function AnalysisDisplay() {
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        setAnalysis(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const canRun = useMemo(() => input.trim().length >= 15, [input])

  const run = async () => {
    setErr('')
    setLoading(true)
    try {
      const res = await analyzeToday(input)
      setAnalysis(res)
      localStorage.setItem(LS_KEY, JSON.stringify(res))
    } catch (e: any) {
      setErr(e?.message || 'Erro ao analisar')
    } finally {
      setLoading(false)
    }
  }

  const copyResultText = async () => {
    if (!analysis) return
    const lines: string[] = []
    lines.push('CENÁRIO TÁTICO DE HOJE')
    lines.push(analysis.tactical || '')
    lines.push('')
    lines.push('FATORES-CHAVE')
    for (const f of analysis.factors || []) lines.push(`• ${f}`)
    lines.push('')
    lines.push('RESULTADOS REALISTAS')
    for (const r of analysis.realisticResults || []) {
      lines.push(`${r.score} — ${r.label}`)
      lines.push(`${r.why}`)
      lines.push('')
    }
    await navigator.clipboard.writeText(lines.join('\n').trim())
  }

  const copyJSON = async () => {
    if (!analysis) return
    await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2))
  }

  const clearAll = () => {
    setInput('')
    setAnalysis(null)
    setErr('')
    localStorage.removeItem(LS_KEY)
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Dados de entrada</div>
          <button
            onClick={clearAll}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff',
              borderRadius: 12,
              padding: '8px 10px',
              cursor: 'pointer'
            }}
          >
            Limpar
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cola aqui o texto do jogo (stats do dia, forma recente, notas)..."
          style={{
            width: '100%',
            marginTop: 10,
            height: 140,
            padding: 12,
            borderRadius: 14,
            background: '#0b1022',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            outline: 'none'
          }}
        />

        <button
          onClick={run}
          disabled={!canRun || loading}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            border: '0',
            cursor: canRun && !loading ? 'pointer' : 'not-allowed',
            background: canRun && !loading ? '#2563eb' : 'rgba(37,99,235,0.35)',
            color: '#fff',
            fontWeight: 800
          }}
        >
          ⚡ {loading ? 'A analisar…' : 'Gerar Leitura de HOJE'}
        </button>

        {err && (
          <div style={{ marginTop: 10, color: '#ffb4b4', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {err}
          </div>
        )}
      </Card>

      {analysis && (
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800 }}>Cenário tático de hoje</div>
              <Badge text="HOJE" />
            </div>

            <div style={{ marginTop: 10, lineHeight: 1.4, opacity: 0.95, whiteSpace: 'pre-wrap' }}>
              {analysis.tactical || '—'}
            </div>

            {Array.isArray(analysis.factors) && analysis.factors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6, opacity: 0.9 }}>Fatores</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {analysis.factors.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#0b1022',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: 10,
                        borderRadius: 12,
                        opacity: 0.95
                      }}
                    >
                      • {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div style={{ fontWeight: 900, opacity: 0.95 }}>Resultados realistas</div>

          {(analysis.realisticResults || []).slice(0, 2).map((r, idx) => (
            <Card key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 34, fontWeight: 900 }}>{r.score || '—'}</div>
                <Badge text={r.label || (idx === 0 ? 'CENÁRIO BASE' : 'CENÁRIO ALTERNATIVO')} />
              </div>
              <div style={{ marginTop: 6, opacity: 0.92, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                {r.why || '—'}
              </div>
            </Card>
          ))}

          <Card>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={copyResultText}
                style={{
                  background: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                📋 Copiar Resultado
              </button>

              <button
                onClick={copyJSON}
                style={{
                  background: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                🧾 Copiar JSON
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              (Auto-salvo no aparelho. Se fechares e voltares, ele mantém a última análise.)
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
