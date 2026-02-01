import { useEffect, useState } from 'react'
import { analyzeToday } from '../services/api'

export default function AnalysisDisplay() {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('lastAnalysis')
    if (saved) setResult(JSON.parse(saved))
  }, [])

  const generate = async () => {
    const res = await analyzeToday()
    setResult(res)
  }

  return (
    <div style={{ padding:20 }}>
      <button onClick={generate}>⚡ Gerar Leitura de HOJE</button>
      {result && <pre>{result.text}</pre>}
    </div>
  )
}
