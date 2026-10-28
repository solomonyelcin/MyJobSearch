declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    version: string
    text: string
  }
  interface PdfParseOptions {
    max?: number
    pagerender?: (pageData: any) => string | Promise<string>
  }
  function pdfParse(data: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>
  export = pdfParse
}
