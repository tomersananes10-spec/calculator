import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export type ParsedFileResult = {
  text: string
  fileName: string
  fileType: 'pdf' | 'docx'
  pageCount?: number
}

export async function parsePdf(file: File): Promise<ParsedFileResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => item.str)
      .join(' ')
    pages.push(text)
  }

  return {
    text: pages.join('\n\n'),
    fileName: file.name,
    fileType: 'pdf',
    pageCount: pdf.numPages,
  }
}

export async function parseDocx(file: File): Promise<ParsedFileResult> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })

  return {
    text: result.value,
    fileName: file.name,
    fileType: 'docx',
  }
}

export async function parseFile(file: File): Promise<ParsedFileResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return parsePdf(file)
  if (name.endsWith('.docx') || name.endsWith('.doc')) return parseDocx(file)
  throw new Error('סוג קובץ לא נתמך. יש להעלות PDF או DOCX.')
}

export function isFileSupported(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc')
}

export const SUPPORTED_TYPES = '.pdf,.docx,.doc'
export const MAX_FILE_SIZE_MB = 10
