import { Handler } from '@netlify/functions'

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      text: `Cenário tático do dia:
Jogo fechado, ritmo médio.
Resultados mais realistas:
1-0
0-0`
    })
  }
}
