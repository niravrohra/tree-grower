import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY missing')
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}
