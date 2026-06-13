/**
 * pdfService.ts — Relatório INVEST GD v4 PREMIUM
 *
 * P1: Resumo Executivo — 6 KPI cards grandes + Parecer rico + Banner
 * P2: Premissas (100% cards, sem autoTable) + 8 Destaques
 * P3: Tabela 5 colunas + 2 gráficos grandes
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FONTE_LABELS } from '@/types/study'
import type { Study } from '@/types/study'
import type { ResultadosFinanceiros } from '@/types/results'

/* ── Paleta SOLFUS ──────────────────────────────────────────────── */
type RGB = [number, number, number]
const VERDE:    RGB = [11,  94,  59]
const VERDE_LT: RGB = [232, 245, 238]
const LARANJA:  RGB = [255, 140,   0]
const VERMELHO: RGB = [200,  30,  10]
const PRETO:    RGB = [18,  18,  18]
const BRANCO:   RGB = [255, 255, 255]
const CINZA_BG: RGB = [250, 250, 250]
const CINZA_LT: RGB = [240, 240, 240]
const CINZA_MD: RGB = [210, 210, 210]
const CINZA_DK: RGB = [120, 120, 120]

/* ── Layout ─────────────────────────────────────────────────────── */
const PW = 210, PH = 297, ML = 12, MR = 12
const CW = PW - ML - MR  // 186mm

/* ── Helpers primitivos ─────────────────────────────────────────── */
const sf  = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2])
const sd  = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2])
const st  = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2])
const brl = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const num = (n: number, d = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmM = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  return a >= 1e6 ? `${s}R$ ${(a/1e6).toFixed(1)}M`
       : a >= 1e3 ? `${s}R$ ${(a/1e3).toFixed(0)}K`
       : `${s}R$ ${brl(a)}`
}
const fmMbare = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  return a >= 1e6 ? `${s}${(a/1e6).toFixed(1)}M`
       : a >= 1e3 ? `${s}${(a/1e3).toFixed(0)}K`
       : brl(a)
}
// autoTable fillColor helper
const rgb3 = (c: RGB): [number,number,number] => [c[0], c[1], c[2]]

/* ── lastAutoTable helper ───────────────────────────────────────── */
type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } }
const finalY = (d: jsPDF) => (d as unknown as DocWithAutoTable).lastAutoTable.finalY

/* ══════════════════════════════════════════════════════════════════
   LOGO SOLFUS — starburst + texto
══════════════════════════════════════════════════════════════════ */
function drawLogo(doc: jsPDF, x: number, y: number, width: number) {
  const h  = width * 0.38            // logo height proportional
  const cx = x + width * 0.21       // starburst center x
  const cy = y + h * 0.50           // starburst center y
  const r  = h * 0.42               // base radius

  // ── 16 radiating spikes ──
  for (let i = 0; i < 16; i++) {
    const angle  = (i / 16) * 2 * Math.PI - Math.PI / 2
    const isLong = i % 2 === 0
    const len    = isLong ? r * 1.05 : r * 0.55
    const col: RGB = (i % 4 === 0) ? VERMELHO : LARANJA
    sd(doc, col); doc.setLineWidth(isLong ? 0.9 : 0.5)
    doc.line(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
  }

  // ── Large outer arc (thick, sweeping) ──
  sd(doc, LARANJA); doc.setLineWidth(2.8)
  const arcR  = r * 1.72
  const arcN  = 40
  const aS    = -2.05
  const aE    = 0.42
  for (let i = 0; i < arcN; i++) {
    const a1 = aS + (i / arcN) * (aE - aS)
    const a2 = aS + ((i + 1) / arcN) * (aE - aS)
    doc.line(
      cx + Math.cos(a1) * arcR, cy + Math.sin(a1) * arcR,
      cx + Math.cos(a2) * arcR, cy + Math.sin(a2) * arcR,
    )
  }

  // ── Second inner arc ──
  sd(doc, VERMELHO); doc.setLineWidth(1.0)
  const arcR2 = r * 1.48
  for (let i = 0; i < arcN; i++) {
    const a1 = aS + 0.4 + (i / arcN) * (aE - aS - 0.5)
    const a2 = aS + 0.4 + ((i + 1) / arcN) * (aE - aS - 0.5)
    doc.line(
      cx + Math.cos(a1) * arcR2, cy + Math.sin(a1) * arcR2,
      cx + Math.cos(a2) * arcR2, cy + Math.sin(a2) * arcR2,
    )
  }

  // ── Center dot (green outer, yellow inner) ──
  sf(doc, VERDE); doc.circle(cx, cy, r * 0.20, 'F')
  sf(doc, [220, 180, 0] as RGB); doc.circle(cx, cy, r * 0.09, 'F')

  // ── SOLFUS text ──
  st(doc, PRETO)
  doc.setFont('helvetica', 'bold')
  const fs = h * 1.80
  doc.setFontSize(fs)
  doc.text('SOLFUS', x + width * 0.44, cy + (fs * 0.352) / 2)
}

/* ══════════════════════════════════════════════════════════════════
   HEADER COMPLETO — Página 1
══════════════════════════════════════════════════════════════════ */
function drawFullHeader(doc: jsPDF, study: Study) {
  const { ativo } = study

  // Verde bar top
  sf(doc, VERDE); doc.rect(0, 0, PW, 6, 'F')

  // Logo
  drawLogo(doc, ML, 7, 50)

  // Title block
  st(doc, PRETO); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('ANÁLISE DE VIABILIDADE', ML + 55, 14)
  doc.text('PARA AQUISIÇÃO DE ATIVO DE GERAÇÃO', ML + 55, 20)
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
  doc.text(`${FONTE_LABELS[ativo.fonte] ?? ativo.fonte}  ·  ${ativo.tipoGD}  ·  ${ativo.concessionaria || '—'}  ·  ${new Date().toLocaleDateString('pt-BR')}`, ML + 55, 26)

  // Plant name badge (right side)
  const bw = 68, bh = 22, bx = PW - MR - bw, by = 8
  sf(doc, VERDE); sd(doc, VERDE); doc.rect(bx, by, bw, bh, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
  doc.text('ATIVO EM ANÁLISE', bx + bw / 2, by + 5.5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  const nameLines = doc.splitTextToSize(ativo.nomeUsina || 'Usina', bw - 6)
  doc.text(nameLines, bx + bw / 2, by + 11.5, { align: 'center' })

  // Orange accent line under header
  sf(doc, LARANJA); doc.rect(ML, 32, CW, 1.2, 'F')
}

/* ══════════════════════════════════════════════════════════════════
   HEADER COMPACTO — Páginas 2 e 3
══════════════════════════════════════════════════════════════════ */
function drawCompactHeader(doc: jsPDF, study: Study) {
  sf(doc, VERDE); doc.rect(0, 0, PW, 4.5, 'F')
  drawLogo(doc, ML, 5.5, 32)
  st(doc, PRETO); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text(study.ativo.nomeUsina || 'Usina', PW / 2, 12, { align: 'center' })
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
  doc.text('ANÁLISE DE VIABILIDADE – INVEST GD', PW / 2, 17, { align: 'center' })
  sf(doc, LARANJA); doc.rect(ML, 19.5, CW, 0.8, 'F')
}

/* ══════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════ */
function drawFooter(doc: jsPDF, page: number) {
  sf(doc, VERDE); doc.rect(0, PH - 9, PW, 9, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5)
  doc.text('SOLFUS ENGENHARIA E CONSERVAÇÃO DE ENERGIA', ML, PH - 3.5)
  doc.text(`Página ${page} de 3`, PW - MR, PH - 3.5, { align: 'right' })
}

/* ══════════════════════════════════════════════════════════════════
   SECTION BANNER
══════════════════════════════════════════════════════════════════ */
function sectionBanner(doc: jsPDF, y: number, title: string, sub?: string) {
  sf(doc, VERDE); doc.rect(ML, y, CW, 8, 'F')
  sf(doc, LARANJA); doc.rect(ML, y, 4, 8, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text(title, ML + 9, y + 5.5)
  if (sub) {
    st(doc, [200, 230, 215] as RGB); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
    doc.text(sub, PW - MR - 2, y + 5.5, { align: 'right' })
  }
  return y + 8
}

/* ══════════════════════════════════════════════════════════════════
   KPI CARD — PREMIUM (grande, impactante)
══════════════════════════════════════════════════════════════════ */
type Accent = 'green' | 'orange' | 'red' | 'gray'

function drawKpiPremium(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string, unit: string, accent: Accent,
) {
  const acRGB: RGB =
    accent === 'green'  ? VERDE   :
    accent === 'orange' ? LARANJA :
    accent === 'red'    ? VERMELHO : CINZA_MD

  // Card background + shadow effect (slightly offset rect)
  sf(doc, CINZA_LT); doc.rect(x + 0.6, y + 0.6, w, h, 'F')
  sf(doc, BRANCO); sd(doc, CINZA_MD); doc.setLineWidth(0.2)
  doc.rect(x, y, w, h, 'FD')

  // Top accent bar
  sf(doc, acRGB); doc.rect(x, y, w, 5, 'F')

  // Bottom accent bar
  sf(doc, acRGB); doc.rect(x, y + h - 2, w, 2, 'F')

  // Label (uppercase, small, gray)
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
  const lls = doc.splitTextToSize(label.toUpperCase(), w - 6)
  doc.text(lls, x + w / 2, y + 12, { align: 'center' })

  // Value — hero number
  const valCol: RGB = accent === 'green' ? VERDE : accent === 'orange' ? LARANJA : accent === 'red' ? VERMELHO : PRETO
  st(doc, valCol); doc.setFont('helvetica', 'bold')
  const vLen = value.length
  doc.setFontSize(vLen > 14 ? 12 : vLen > 10 ? 15 : vLen > 7 ? 18 : 22)
  doc.text(value, x + w / 2, y + h * 0.62, { align: 'center' })

  // Unit / subtitle
  if (unit) {
    st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
    doc.text(unit, x + w / 2, y + h - 6, { align: 'center' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   DATA CARD (página 2 — sem autoTable)
══════════════════════════════════════════════════════════════════ */
function drawDataCard(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string, isEven: boolean, accent: RGB,
) {
  sf(doc, isEven ? CINZA_BG : BRANCO)
  doc.rect(x, y, w, h, 'F')
  // left accent bar
  sf(doc, accent); doc.rect(x, y, 2.5, h, 'F')
  // label
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8)
  doc.text(label, x + 6, y + h * 0.42)
  // value
  st(doc, PRETO); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
  doc.text(value, x + w - 3, y + h * 0.75, { align: 'right' })
  // thin bottom border
  sd(doc, CINZA_LT); doc.setLineWidth(0.15)
  doc.line(x, y + h, x + w, y + h)
}

/* ══════════════════════════════════════════════════════════════════
   COLUMN SECTION HEADER (página 2)
══════════════════════════════════════════════════════════════════ */
function drawColHeader(doc: jsPDF, x: number, y: number, w: number, title: string) {
  sf(doc, VERDE); doc.rect(x, y, w, 9, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
  doc.text(title, x + w / 2, y + 6, { align: 'center' })
  return y + 9
}

/* ══════════════════════════════════════════════════════════════════
   CAPEX BOX (página 2)
══════════════════════════════════════════════════════════════════ */
function drawCapexBox(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string, highlight = false,
) {
  sf(doc, highlight ? VERDE : CINZA_BG)
  sd(doc, highlight ? VERDE : CINZA_MD)
  doc.setLineWidth(highlight ? 0.5 : 0.2)
  doc.rect(x, y, w, h, 'FD')

  if (highlight) {
    st(doc, BRANCO); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
    doc.text(label, x + w / 2, y + h * 0.35, { align: 'center' })
    st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text(value, x + w / 2, y + h * 0.72, { align: 'center' })
  } else {
    sf(doc, LARANJA); doc.rect(x, y, w, 3, 'F')
    st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
    doc.text(label, x + w / 2, y + h * 0.42, { align: 'center' })
    st(doc, PRETO); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(value, x + w / 2, y + h * 0.78, { align: 'center' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   BAR CHART (grande, premium)
══════════════════════════════════════════════════════════════════ */
interface BarSeries { label: string; values: number[]; color: RGB }

function drawBarChart(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  title: string, anos: number[], series: BarSeries[],
) {
  // Chart title
  st(doc, PRETO); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text(title, x + w / 2, y + 6, { align: 'center' })

  const pL = 18, pR = 5, pT = 11, pB = 18
  const cw = w - pL - pR, ch = h - pT - pB
  const n  = anos.length

  const allVals = series.flatMap(s => s.values).map(Math.abs)
  const maxV    = Math.max(...allVals, 1)

  // Plot area background
  sf(doc, CINZA_BG); doc.rect(x + pL, y + pT, cw, ch, 'F')

  // Grid lines + Y labels
  const gridCount = 5
  sd(doc, [220, 220, 220] as RGB); doc.setLineWidth(0.12)
  for (let i = 0; i <= gridCount; i++) {
    const gy = y + pT + (i / gridCount) * ch
    doc.line(x + pL, gy, x + pL + cw, gy)
    const v = maxV * (1 - i / gridCount)
    st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(4.2)
    doc.text(fmMbare(v), x + pL - 1.5, gy + 1.2, { align: 'right' })
  }

  // Bars
  const slotW = cw / n
  const sn    = series.length
  const barW  = Math.min(slotW * 0.85 / sn, 9)

  series.forEach((ser, si) => {
    sf(doc, ser.color)
    ser.values.forEach((val, ai) => {
      const bh  = Math.max((Math.abs(val) / maxV) * ch, 0.4)
      const bx  = x + pL + ai * slotW + (slotW - sn * barW) / 2 + si * barW
      doc.rect(bx, y + pT + ch - bh, barW - 0.4, bh, 'F')
    })
  })

  // Axes
  sd(doc, CINZA_MD); doc.setLineWidth(0.4)
  doc.line(x + pL, y + pT, x + pL, y + pT + ch)
  doc.line(x + pL, y + pT + ch, x + pL + cw, y + pT + ch)

  // X labels
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(4.2)
  const step = n > 15 ? 5 : n > 8 ? 2 : 1
  anos.forEach((a, ai) => {
    if (a % step === 0) {
      const lx = x + pL + ai * slotW + slotW / 2
      doc.text(`${a}`, lx, y + pT + ch + 4.5, { align: 'center' })
    }
  })
  doc.text('Ano', x + pL + cw / 2, y + pT + ch + 9, { align: 'center' })

  // Legend
  series.forEach((ser, si) => {
    const lx = x + pL + 2 + si * 55
    const ly = y + pT + ch + 13
    sf(doc, ser.color); doc.rect(lx, ly, 6, 3, 'F')
    st(doc, CINZA_DK); doc.setFontSize(4.5)
    doc.text(ser.label, lx + 7.5, ly + 2.5)
  })
}

/* ══════════════════════════════════════════════════════════════════
   OPINION BUILDERS
══════════════════════════════════════════════════════════════════ */
function buildOpinion(tir: number | null, vpl: number, tma: number, pb: number | null, vidaUtil: number): string {
  const pbStr = pb ? `${pb.toFixed(1)} anos` : 'não atingido'
  if (!tir) return 'Não foi possível calcular a Taxa Interna de Retorno com os fluxos fornecidos. Revise as premissas de receita e CAPEX.'
  if (tir > tma && vpl > 0)
    return `A análise quantitativa demonstra que o ativo apresenta robustez econômico-financeira consistente com os parâmetros de investimento definidos. A Taxa Interna de Retorno de ${tir.toFixed(2)}% a.a. supera em ${(tir - tma).toFixed(2)} p.p. a Taxa Mínima de Atratividade de ${tma.toFixed(2)}% a.a., confirmando geração de valor acima do custo de oportunidade do capital. O Valor Presente Líquido positivo de R$ ${brl(vpl)} corrobora a viabilidade do investimento ao horizonte de ${vidaUtil} anos, com Payback estimado em ${pbStr}.`
  if (tir > tma)
    return `A TIR de ${tir.toFixed(2)}% a.a. supera a TMA de ${tma.toFixed(2)}% a.a., porém o VPL negativo de R$ ${brl(vpl)} indica que o retorno absoluto não cobre o investimento nas condições atuais. Recomenda-se revisão das premissas tarifárias ou renegociação do valor do ativo.`
  return `A TIR apurada de ${tir.toFixed(2)}% a.a. está abaixo da TMA de ${tma.toFixed(2)}% a.a. Nas condições simuladas, o investimento não supera o custo de oportunidade do capital. Recomenda-se revisão estrutural das premissas de receita, tarifa e CAPEX antes de avançar.`
}

/* ══════════════════════════════════════════════════════════════════
   EXPORT PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export async function gerarRelatorioPDF(study: Study, res: ResultadosFinanceiros): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')

  const { ativo, capex, tarifas, tributos, premissasFinanceiras: pf, opex } = study
  const tir      = res.tir
  const vpl      = res.vpl
  const pb       = res.paybackSimples
  const ebitda1  = res.ebitdaAnual
  const rec1     = res.receitaAnual
  const geranual = res.geracaoMediaMensal * 12
  const geramens = res.geracaoMediaMensal
  const isViavel     = tir != null && tir > pf.tma && vpl > 0
  const allRows      = res.tabela.filter(r => r.ano > 0)
  const anoLast      = allRows[allRows.length - 1]
  const recBrutaLast = anoLast?.receitaBruta ?? 0
  const recLiqLast   = anoLast?.ebitda       ?? 0
  const ebitdaAcum   = allRows.reduce((s, r) => s + r.ebitda, 0)
  const recBrutaAcum = allRows.reduce((s, r) => s + r.receitaBruta, 0)
  const isSolar      = ativo.fonte === 'ufv' || ativo.fonte === 'solar'
  const potUnit      = isSolar ? 'kWp' : 'kW'

  /* ╔══════════════════════════════════════════════════════════════╗
     ║  PÁGINA 1 — RESUMO EXECUTIVO                                 ║
     ╚══════════════════════════════════════════════════════════════╝ */
  drawFullHeader(doc, study)

  // ── INDICADORES PRINCIPAIS ──────────────────────────────────────
  let cy = 35
  cy = sectionBanner(doc, cy, 'INDICADORES PRINCIPAIS', 'Métricas-chave do investimento') + 3

  interface KpiDef { label: string; value: string; unit: string; accent: Accent }
  const kpis: KpiDef[] = [
    { label: 'Valor Presente Líquido',    value: brl(vpl),                           unit: 'R$  ·  VPL',                              accent: vpl >= 0 ? 'green' : 'red' },
    { label: 'Taxa Interna de Retorno',   value: tir ? `${num(tir, 2)}%` : '—',    unit: `a.a.  ·  TMA: ${num(pf.tma, 2)}%`,       accent: tir && tir > pf.tma ? 'orange' : 'red' },
    { label: 'Payback Simples',           value: pb ? `${num(pb, 1)} anos` : '—',  unit: 'Retorno do capital investido',            accent: 'orange' },
    { label: 'EBITDA Acumulado',           value: brl(ebitdaAcum),                    unit: `R$  ·  Ciclo ${pf.vidaUtil} anos`,         accent: 'green' },
    { label: 'CAPEX Total',               value: brl(capex.total),                   unit: 'R$  ·  Investimento total',               accent: 'gray' },
    { label: 'Geração Anual',             value: brl(geranual),                      unit: `MWh  ·  ${num(geramens, 1)} MWh/mês`,    accent: 'green' },
  ]

  const kW = CW / 3 - 1.2, kH = 55
  // Row 1
  kpis.slice(0, 3).forEach((k, i) =>
    drawKpiPremium(doc, ML + i * (kW + 1.8), cy, kW, kH, k.label, k.value, k.unit, k.accent))
  cy += kH + 3.5
  // Row 2
  kpis.slice(3).forEach((k, i) =>
    drawKpiPremium(doc, ML + i * (kW + 1.8), cy, kW, kH, k.label, k.value, k.unit, k.accent))
  cy += kH + 6

  // ── PARECER EXECUTIVO ───────────────────────────────────────────
  cy = sectionBanner(doc, cy, 'PARECER EXECUTIVO', '') + 3

  const pareH = PH - 9 - cy - 22  // leave room for verdict
  sf(doc, VERDE_LT); sd(doc, CINZA_MD); doc.setLineWidth(0.15)
  doc.rect(ML, cy, CW, pareH, 'FD')
  sf(doc, VERDE); doc.rect(ML, cy, 4.5, pareH, 'F')  // left bar

  // Checkmark circle
  sf(doc, VERDE); doc.circle(ML + 18, cy + 16, 10, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('✓', ML + 18, cy + 20, { align: 'center' })

  // Opinion paragraph
  const opinion = buildOpinion(tir, vpl, pf.tma, pb, pf.vidaUtil)
  st(doc, PRETO); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  const opLines = doc.splitTextToSize(opinion, CW - 35)
  doc.text(opLines, ML + 30, cy + 8)

  // Divider
  const divY = cy + 10 + opLines.length * 4
  sd(doc, CINZA_MD); doc.setLineWidth(0.25); doc.line(ML + 8, divY, PW - MR - 5, divY)

  // Mini metrics row (4 items)
  interface MetricItem { label: string; value: string; color: RGB }
  const metrics: MetricItem[] = [
    { label: 'TIR',            value: tir ? `${num(tir, 2)}%` : '—',   color: tir && tir > pf.tma ? VERDE : VERMELHO },
    { label: 'VPL',            value: `R$ ${brl(vpl)}`,                  color: vpl >= 0 ? VERDE : VERMELHO },
    { label: 'Payback',        value: pb ? `${num(pb, 1)} anos` : '—',  color: LARANJA },
    { label: 'TMA',            value: `${num(pf.tma, 2)}%`,             color: CINZA_DK },
  ]
  const mW = (CW - 16) / 4
  metrics.forEach((m, i) => {
    const mx = ML + 8 + i * (mW + 0.8)
    const my = divY + 4
    sf(doc, BRANCO); sd(doc, CINZA_MD); doc.setLineWidth(0.12)
    doc.rect(mx, my, mW, 16, 'FD')
    st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
    doc.text(m.label, mx + mW / 2, my + 5, { align: 'center' })
    st(doc, m.color); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(m.value, mx + mW / 2, my + 12.5, { align: 'center' })
  })

  // Second paragraph (complementary analysis)
  const p2Y = divY + 26
  const p2 = tir && tir > pf.tma
    ? `A receita bruta estimada para o primeiro ano é de R$ ${brl(rec1)}, com geração anual projetada de ${brl(geranual)} MWh. O período de vida útil de ${pf.vidaUtil} anos permite amortização confortável do CAPEX de R$ ${brl(capex.total)}, com EBITDA do primeiro ano de R$ ${brl(ebitda1)}.`
    : `A receita bruta estimada para o primeiro ano é de R$ ${brl(rec1)}, com geração anual projetada de ${brl(geranual)} MWh. Recomenda-se análise detalhada de sensibilidade nas premissas tarifárias e de CAPEX para identificar alavancas de melhoria da rentabilidade.`
  st(doc, PRETO); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  const p2Lines = doc.splitTextToSize(p2, CW - 20)
  doc.text(p2Lines, ML + 10, p2Y)

  cy = PH - 9 - 19

  // ── VERDICT BANNER ──────────────────────────────────────────────
  sf(doc, isViavel ? VERDE : VERMELHO); doc.rect(ML, cy, CW, 16, 'F')
  st(doc, BRANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text(
    isViavel ? '✓   ATIVO VIÁVEL PARA INVESTIMENTO' : '⚠   ANÁLISE RECOMENDA CAUTELA',
    PW / 2, cy + 10.5, { align: 'center' },
  )

  drawFooter(doc, 1)

  /* ╔══════════════════════════════════════════════════════════════╗
     ║  PÁGINA 2 — PREMISSAS E INVESTIMENTOS                        ║
     ╚══════════════════════════════════════════════════════════════╝ */
  doc.addPage()
  drawCompactHeader(doc, study)

  cy = 22
  cy = sectionBanner(doc, cy, 'PREMISSAS E INVESTIMENTOS', 'Dados de entrada utilizados na modelagem') + 4

  const c1W = 56, c2W = 56, c3W = 70
  const c1X = ML, c2X = ML + c1W + 4, c3X = c2X + c2W + 4

  // ── Col 1: Premissas Técnicas ───────────────────────────────────
  let c1Y = drawColHeader(doc, c1X, cy, c1W, 'PREMISSAS TÉCNICAS')
  const tecItems: [string, string][] = [
    ['Fonte de Energia',       FONTE_LABELS[ativo.fonte] ?? ativo.fonte],
    [`Potência Instalada (${potUnit})`, `${brl(ativo.potencia)} ${potUnit}`],
    ['Fator de Capacidade',    `${num(ativo.fatorCapacidade, 2)}%`],
    ['Tipo de GD',             ativo.tipoGD],
    ['Concessionária',         ativo.concessionaria || '—'],
    ['Geração Mensal',         `${num(geramens, 1)} MWh`],
    ['Geração Anual',          `${brl(geranual)} MWh`],
    ['Consumo Anual (MWh)',     `${num((ativo.consumoAnualUG ?? 0) / 1000, 1)} MWh`],
  ]
  const rowH = 11
  tecItems.forEach(([l, v], i) => {
    drawDataCard(doc, c1X, c1Y, c1W, rowH, l, v, i % 2 === 0, VERDE)
    c1Y += rowH
  })

  // ── Col 2: Premissas Financeiras ────────────────────────────────
  let c2Y = drawColHeader(doc, c2X, cy, c2W, 'PREMISSAS FINANCEIRAS')
  const finItems: [string, string][] = [
    ['TUSD G',                 `R$ ${num(tarifas.tusdG, 4)}/kW`],
    ['Tarifa de Venda',        `R$ ${num(tarifas.tarifaVenda, 2)}/MWh`],
    ['Reajuste Anual',         `${num(tarifas.reajusteAnual, 2)}%`],
    ['PIS',                    `${num(tributos.pis, 2)}%`],
    ['COFINS',                 `${num(tributos.cofins, 2)}%`],
    ['ICMS',                   `${num(tributos.icms, 2)}%`],
    ['Tributos s/ Receita',    `${num(tributos.tributosReceita, 2)}%`],
    ['TMA',                    `${num(pf.tma, 2)}% a.a.`],
    ['SELIC',                  `${num(pf.selic, 2)}% a.a.`],
    ['IPCA',                   `${num(pf.inflacao, 2)}% a.a.`],
    ['Vida Útil',              `${pf.vidaUtil} anos`],
  ]
  finItems.forEach(([l, v], i) => {
    drawDataCard(doc, c2X, c2Y, c2W, rowH, l, v, i % 2 === 0, LARANJA)
    c2Y += rowH
  })

  // OPEX
  c2Y += 3
  c2Y = drawColHeader(doc, c2X, c2Y, c2W, 'OPEX (% CAPEX)') + 0
  const opexItems: [string, string][] = [
    ['Operação',               `${num(opex.operacao, 2)}%`],
    ['Manutenção',             `${num(opex.manutencao, 2)}%`],
    ['Seguro',                 `${num(opex.seguro, 2)}%`],
    ['Gestão (% Receita)',     `${num(opex.gestao, 2)}%`],
    ['Arrendamento/mês',       `R$ ${brl(opex.arrendamento)}`],
    ['Gestão Fixo/mês',        `R$ ${brl(opex.fixoGestao)}`],
  ]
  opexItems.forEach(([l, v], i) => {
    drawDataCard(doc, c2X, c2Y, c2W, rowH, l, v, i % 2 === 0, LARANJA)
    c2Y += rowH
  })

  // ── Col 3: Investimentos e Destaques ────────────────────────────
  let c3Y = drawColHeader(doc, c3X, cy, c3W, 'ESTRUTURA DE INVESTIMENTO')
  const boxH = 27, boxG = 4

  drawCapexBox(doc, c3X, c3Y,       c3W, boxH, 'Custo da Usina',        `R$ ${brl(capex.usina)}`)
  drawCapexBox(doc, c3X, c3Y+boxH+boxG, c3W, boxH, 'Custo da Obra de Rede', `R$ ${brl(capex.obraRede)}`)
  drawCapexBox(doc, c3X, c3Y+2*(boxH+boxG), c3W, boxH, 'TOTAL DO INVESTIMENTO',  `R$ ${brl(capex.total)}`, true)
  c3Y += 3 * (boxH + boxG) + 4

  // OPEX Ano 1 box
  const opexRow1 = allRows.find(r => r.ano === 1)
  if (opexRow1) {
    drawCapexBox(doc, c3X, c3Y, c3W, boxH, 'OPEX Total – Ano 1', `R$ ${brl(opexRow1.opexTotal)}`)
    c3Y += boxH + boxG
  }

  // Small financial note
  const noteY = c3Y + 3
  sf(doc, CINZA_BG); doc.rect(c3X, noteY, c3W, 20, 'F')
  sf(doc, LARANJA); doc.rect(c3X, noteY, 2.5, 20, 'F')
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8)
  doc.text('Receita Bruta Ano 1', c3X + 6, noteY + 5.5)
  st(doc, VERDE); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(`R$ ${brl(rec1)}`, c3X + 6, noteY + 13)
  st(doc, CINZA_DK); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8)
  doc.text(`Rec. Líquida: R$ ${brl(ebitda1)}`, c3X + 6, noteY + 18)

  // ── DESTAQUES DO PROJETO ─────────────────────────────────────────
  const maxColEnd = Math.max(c1Y, c2Y) + 6
  cy = maxColEnd
  cy = sectionBanner(doc, cy, 'DESTAQUES DO PROJETO', '9 indicadores-chave') + 4

  interface DstDef { label: string; value: string; unit: string; accent: Accent }
  const dstItems: DstDef[] = [
    { label: 'Rec. Bruta Ano 1',               value: `R$ ${brl(rec1)}`,                  unit: '',                              accent: 'green'  },
    { label: 'Rec. Líquida Ano 1',             value: `R$ ${brl(ebitda1)}`,               unit: 'EBITDA',                        accent: 'green'  },
    { label: 'TIR (% a.a.)',                   value: tir ? `${num(tir, 2)}%` : '—',     unit: `TMA: ${num(pf.tma, 2)}%`,      accent: tir && tir > pf.tma ? 'orange' : 'red' },
    { label: 'VPL',                            value: `R$ ${brl(vpl)}`,                   unit: 'Valor Presente Líquido',        accent: vpl >= 0 ? 'green' : 'red' },
    { label: 'Payback Simples',                value: pb ? `${num(pb, 1)} anos` : '—',   unit: 'Retorno do capital',            accent: 'orange' },
    { label: `Rec. Bruta Ano ${anoLast?.ano ?? pf.vidaUtil}`, value: `R$ ${brl(recBrutaLast)}`, unit: 'Último ano',            accent: 'green'  },
    { label: `Rec. Líq. Ano ${anoLast?.ano ?? pf.vidaUtil}`,  value: `R$ ${brl(recLiqLast)}`,  unit: 'Último ano',            accent: 'orange' },
    { label: 'EBITDA Acumulado',               value: `R$ ${brl(ebitdaAcum)}`,            unit: `Ciclo ${pf.vidaUtil} anos`,     accent: 'orange' },
    { label: 'Receita Acumulada',              value: `R$ ${brl(recBrutaAcum)}`,          unit: `Ciclo ${pf.vidaUtil} anos`,     accent: 'green'  },
  ]

  const dstCols = 3
  const dstW    = (CW - (dstCols - 1) * 2) / dstCols
  const dstH    = PH - 9 - cy - 4
  const dstRowH = Math.min(dstH / 3 - 1.5, 30)

  dstItems.forEach((item, idx) => {
    const row = Math.floor(idx / dstCols)
    const col = idx % dstCols
    const dx  = ML + col * (dstW + 2)
    const dy  = cy + row * (dstRowH + 2)
    drawKpiPremium(doc, dx, dy, dstW, dstRowH, item.label, item.value, item.unit, item.accent)
  })

  drawFooter(doc, 2)

  /* ╔══════════════════════════════════════════════════════════════╗
     ║  PÁGINA 3 — DESEMPENHO FINANCEIRO                            ║
     ╚══════════════════════════════════════════════════════════════╝ */
  doc.addPage()
  drawCompactHeader(doc, study)

  cy = 22
  cy = sectionBanner(doc, cy, 'DESEMPENHO FINANCEIRO', 'Projeção anual do período de vida útil') + 3

  // ── Tabela financeira (5 colunas) ───────────────────────────────
  // Build display rows: all years
  autoTable(doc, {
    startY: cy,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    head: [['ANO', 'RECEITA BRUTA', 'TRIBUTOS', 'OPEX TOTAL', 'RECEITA LÍQUIDA']],
    body: allRows.map(r => [
      `${r.ano}`,
      `R$ ${brl(r.receitaBruta)}`,
      `R$ ${brl(r.tributos)}`,
      `R$ ${brl(r.opexTotal)}`,
      `R$ ${brl(r.ebitda)}`,
    ]),
    headStyles: {
      fillColor: rgb3(VERDE), textColor: rgb3(BRANCO),
      fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 3.5,
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 3.5, halign: 'right' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: CW * 0.22 },
      2: { cellWidth: CW * 0.19 },
      3: { cellWidth: CW * 0.20 },
      4: { cellWidth: CW * 0.24, textColor: rgb3(VERDE), fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: rgb3(CINZA_BG) },
    theme: 'plain',
    didDrawPage: () => { /* noop */ },
  })

  const tableBottom = finalY(doc)

  // ── 3 gráficos empilhados verticalmente ─────────────────────────
  const chartStart  = tableBottom + 6
  const chartBottom = PH - 9 - 2
  const totalH      = chartBottom - chartStart
  const chartH      = (totalH - 6) / 3   // 3 charts + 2 gaps of 3mm
  const chartW      = CW

  const chartRows = allRows.slice(0, pf.vidaUtil)
  const fluxoRows = [
    { ano: 0, fluxo: res.tabela[0]?.fluxoAcumulado ?? -res.capex },
    ...chartRows.map(r => ({ ano: r.ano, fluxo: r.fluxoAcumulado })),
  ]

  // Chart 1 — Receita Líquida por Ano
  sf(doc, CINZA_BG); sd(doc, CINZA_MD); doc.setLineWidth(0.2)
  doc.rect(ML, chartStart, chartW, chartH, 'FD')
  drawBarChart(
    doc, ML, chartStart, chartW, chartH,
    'Receita Líquida por Ano (R$)',
    chartRows.map(r => r.ano),
    [{ label: 'Receita Líquida (EBITDA)', values: chartRows.map(r => r.ebitda), color: VERDE }],
  )

  // Chart 2 — Receita Bruta vs OPEX
  const ch2Y = chartStart + chartH + 3
  sf(doc, CINZA_BG); sd(doc, CINZA_MD); doc.setLineWidth(0.2)
  doc.rect(ML, ch2Y, chartW, chartH, 'FD')
  drawBarChart(
    doc, ML, ch2Y, chartW, chartH,
    'Evolução da Receita Bruta e OPEX (R$)',
    chartRows.map(r => r.ano),
    [
      { label: 'Receita Bruta', values: chartRows.map(r => r.receitaBruta), color: LARANJA },
      { label: 'OPEX Total',    values: chartRows.map(r => r.opexTotal),    color: CINZA_MD },
    ],
  )

  // Chart 3 — Fluxo Acumulado
  const ch3Y = ch2Y + chartH + 3
  sf(doc, CINZA_BG); sd(doc, CINZA_MD); doc.setLineWidth(0.2)
  doc.rect(ML, ch3Y, chartW, chartH, 'FD')
  drawBarChart(
    doc, ML, ch3Y, chartW, chartH,
    'Fluxo de Caixa Acumulado (R$)',
    fluxoRows.map(r => r.ano),
    [{ label: 'Fluxo Acumulado', values: fluxoRows.map(r => r.fluxo), color: VERDE }],
  )

  drawFooter(doc, 3)

  // ── Save ─────────────────────────────────────────────────────────
  const nome = (ativo.nomeUsina || 'USINA').replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()
  const data = new Date().toISOString().slice(0, 10)
  doc.save(`INVEST-GD_${nome}_${data}.pdf`)
}
