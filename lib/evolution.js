import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

/**
 * Cliente da Evolution API para WhatsApp
 */
export class EvolutionClient {
  constructor(instanceName = 'chatia') {
    this.instanceName = instanceName
    this.baseURL = EVOLUTION_API_URL
    this.apiKey = EVOLUTION_API_KEY
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Envia mensagem de texto para um número
   */
  async sendText(remoteJid, text) {
    try {
      const response = await this.client.post(`/message/sendText/${this.instanceName}`, {
        number: remoteJid,
        text,
      })
      
      return response.data
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Verifica se a instância está conectada
   */
  async checkConnection() {
    try {
      const response = await this.client.get(`/instance/connectionState/${this.instanceName}`)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error.response?.data || error.message)
      return { state: 'close' }
    }
  }

  /**
   * Obtém informações da instância
   */
  async getInstanceInfo() {
    try {
      const response = await this.client.get(`/instance/fetchInstances?instanceName=${this.instanceName}`)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao obter info da instância:', error.response?.data || error.message)
      throw error
    }
  }
}

export default EvolutionClient
