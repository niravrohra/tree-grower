// lib/resume/parse.ts
import pdf from "pdf-parse"
import mammoth from "mammoth"

export async function extractTextFromFile(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  const lower = file.name.toLowerCase()

  // PDF
  if (file.type.includes("pdf") || lower.endsWith(".pdf")) {
    const data = await pdf(buf)
    return data.text
  }

  // DOCX
  if (
    file.type.includes("officedocument.wordprocessingml.document") ||
    lower.endsWith(".docx")
  ) {
    const { value } = await mammoth.extractRawText({ buffer: buf })
    return value
  }

  // Plain text / fallback
  return buf.toString("utf8")
}
