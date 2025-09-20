declare module "pdf-parse" {
  interface PDFInfo {
    PDFFormatVersion: string
    IsAcroFormPresent: boolean
    IsXFAPresent: boolean
    // …you can expand as needed
  }

  interface PDFMetadata {
    info: PDFInfo
    metadata: any
    text: string
    version: string
  }

  function pdf(dataBuffer: Buffer): Promise<PDFMetadata>

  export = pdf
}
