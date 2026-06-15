/* Auto-generated minimal jsPDF types for INVEST GD */
declare module 'jspdf' {
  class jsPDF {
    constructor(options?: {
      orientation?: 'portrait' | 'landscape' | 'p' | 'l'
      unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px' | 'pc' | 'em' | 'ex'
      format?: string | [number, number]
      compress?: boolean
    })
    // Page
    addPage(format?: string | [number, number], orientation?: string): jsPDF
    internal: { pageSize: { getWidth(): number; getHeight(): number }; pages: unknown[] }
    // Drawing
    setFillColor(r: number, g: number, b: number): jsPDF
    setDrawColor(r: number, g: number, b: number): jsPDF
    setTextColor(r: number, g: number, b: number): jsPDF
    setLineWidth(w: number): jsPDF
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): jsPDF
    line(x1: number, y1: number, x2: number, y2: number): jsPDF
    circle(x: number, y: number, r: number, style?: string): jsPDF
    ellipse(x: number, y: number, rx: number, ry: number, style?: string): jsPDF
    // Text
    setFont(fontName: string, fontStyle?: string, fontWeight?: string | number): jsPDF
    setFontSize(size: number): jsPDF
    text(text: string | string[], x: number, y: number, options?: {
      align?: 'left' | 'center' | 'right' | 'justify'
      baseline?: string
      angle?: number
      maxWidth?: number
    }): jsPDF
    getTextWidth(text: string): number
    splitTextToSize(text: string, maxWidth: number): string[]
    // Image
    addImage(imageData: string | HTMLImageElement | HTMLCanvasElement, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: string, rotation?: number): jsPDF
    // Save
    save(filename?: string): jsPDF
    output(type?: string, options?: unknown): string | ArrayBuffer
    // Autosize helper
    setPage(page: number): jsPDF
    getNumberOfPages(): number
  }
  export { jsPDF }
  export default jsPDF
}
