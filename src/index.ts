import https, { Agent } from 'https'

import axios from 'axios'
import fs from 'fs'
import qs from 'qs'

type Scope =
  | 'extrato.read'
  | 'boleto-cobranca.read'
  | 'boleto-cobranca.write'
  | 'pagamento-boleto.write'
  | 'pagamento-boleto.read'
  | 'pagamento-darf.write'
  | 'cob.write'
  | 'cob.read'
  | 'cobv.write'
  | 'cobv.read'
  | 'pix.write'
  | 'pix.read'
  | 'webhook.read'
  | 'webhook.write'
  | 'payloadlocation.write'
  | 'payloadlocation.read'
  | 'pagamento-pix.write'
  | 'pagamento-pix.read'
  | 'webhook-banking.write'
  | 'webhook-banking.read'

interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

class Inter {
  private readonly baseUrl = 'https://cdpj.partners.bancointer.com.br'
  private httpsAgent: Agent
  private token: OAuthTokenResponse | null = null

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly cert: Buffer,
    private readonly key: Buffer,
    private readonly scope: Scope[]
  ) {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      cert: this.cert,
      key: this.key
    })
  }

  private async authenticate() {
    if (this.token) {
      return
    }

    const AUTH_PAYLOAD = qs.stringify({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: this.scope.join(' '),
      grant_type: 'client_credentials'
    })

    const AUTH_CONFIG = {
      method: 'POST',
      maxBodyLength: Infinity,
      url: `${this.baseUrl}/oauth/v2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent: this.httpsAgent,
      data: AUTH_PAYLOAD
    }

    try {
      const response = await axios.request(AUTH_CONFIG)
      this.token = response.data
    } catch (error) {
      console.log((error as any).message)
    }
  }

  public async makePixPayment(payload: any) {
    if (!this.token) {
      await this.authenticate()
    }

    try {
      const response = await axios.request({
        method: 'POST',
        maxBodyLength: Infinity,
        url: `${this.baseUrl}/banking/v2/pix`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token?.access_token}`
        },
        httpsAgent: this.httpsAgent,
        data: payload
      })

      return response.data
    } catch (error) {
      console.error((error as any).message)
    }
  }
}

const run = async () => {
  const inter = new Inter(
    'PUBLIC-KEY',
    'PRIVATE-KEY',
    fs.readFileSync('cert.crt'),
    fs.readFileSync('key.key'),
    ['pagamento-pix.write']
  )

  inter.makePixPayment({
    valor: 0.01,
    descricao: 'Teste',
    destinatario: {
      tipo: 'CHAVE',
      chave: 'holtzs.william@gmail.com'
    }
  })
}

run()
