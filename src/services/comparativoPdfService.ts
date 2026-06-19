/**
 * comparativoPdfService.ts — PDF Comparativo de Cenários v5
 * Fix: Melhor Cenário — LEFT_RESERVED reduzido, Math.floor no kpiW,
 *      cards garantidamente dentro das margens.
 */
import jsPDF     from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Scenario } from '@/types/scenario'
import type { Study }    from '@/types/study'

/* ── Paleta ── */
type RGB = [number, number, number]
const VERDE:    RGB = [11,  94,  59]
const VERDE_L:  RGB = [232, 245, 238]
const VERDE_D:  RGB = [7,   62,  39]
const GRAFITE:  RGB = [51,  65,  85]
const GRAFITE_L:RGB = [241, 245, 249]
const CINZA_B:  RGB = [250, 250, 250]
const CINZA_D:  RGB = [100, 100, 100]
const BORDA:    RGB = [226, 232, 240]
const BRANCO:   RGB = [255, 255, 255]
const PRETO:    RGB = [18,   18,  18]
const NEGATIVO: RGB = [185,  28,  28]

const PW = 210, PH = 297
const ML = 12,  MR = 12
const CW = PW - ML - MR   // 186 mm

type D = jsPDF & { lastAutoTable: { finalY: number } }
const sf = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2])
const sd = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2])
const st = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2])
const rgb3 = (c: RGB): [number, number, number] => [c[0], c[1], c[2]]

const brl  = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const num  = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtV = (v: number | null | undefined, type: string): string => {
  if (v == null) return '—'
  if (type === 'brl')  return brl(v)
  if (type === 'pct')  return num(v, 2) + '%'
  if (type === 'anos') return num(v, 1) + ' a'
  if (type === 'mwh')  return num(v, 0) + ' MWh'
  return String(v)
}

function scenarioColor(i: number): RGB {
  const palette: RGB[] = [VERDE, GRAFITE, [30, 58, 95], [71, 85, 105], [7, 62, 39], [156, 163, 175]]
  return palette[i % palette.length]
}

/* ── Rodapé ── */
function drawFooter(d: jsPDF, page: number, total: number) {
  sf(d, VERDE); d.rect(0, PH - 9, PW, 9, 'F')
  st(d, BRANCO); d.setFont('helvetica', 'bold').setFontSize(7)
  d.text('SOLFUS ENGENHARIA E CONSERVAÇÃO DE ENERGIA', ML, PH - 3.5)
  d.text(`Página ${page} de ${total}`, PW - MR, PH - 3.5, { align: 'right' })
}

/* ── Separador de seção ── */
function sectionTitle(d: jsPDF, y: number, title: string): number {
  sf(d, VERDE_L); sd(d, VERDE); d.setLineWidth(0.3)
  d.rect(ML, y, CW, 8.5, 'FD')
  sf(d, VERDE);   d.rect(ML, y, 3.5, 8.5, 'F')
  sf(d, GRAFITE); d.rect(ML + 3.5, y, 2, 8.5, 'F')
  st(d, VERDE_D); d.setFont('helvetica', 'bold').setFontSize(8.5)
  d.text(title, ML + 10, y + 5.8)
  return y + 8.5
}

/* ── Cabeçalho Página 1 ── */
async function drawPage1Header(d: jsPDF, study: Study, nCenarios: number, dateStr: string) {
  sf(d, VERDE); d.rect(0, 0, PW, 2.5, 'F')
  sf(d, BRANCO); d.rect(0, 2.5, PW, 32, 'F')

  let logoLoaded = false
  try {
    const resp = await fetch('/solfus-logo.png.png')
    if (resp.ok) {
      const blob = await resp.blob()
      const logoData = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      d.addImage(logoData, 'PNG', ML, 5.5, 36, 19)
      logoLoaded = true
    }
  } catch (_) { /* fallback */ }

  if (!logoLoaded) {
    sf(d, VERDE_L); sd(d, VERDE); d.setLineWidth(0.4)
    d.rect(ML, 5.5, 36, 19, 'FD')
    st(d, VERDE); d.setFont('helvetica', 'bold').setFontSize(11)
    d.text('SOLFUS', ML + 18, 17, { align: 'center' })
  }

  sf(d, GRAFITE); d.rect(ML + 40, 7, 0.6, 15, 'F')
  st(d, PRETO); d.setFont('helvetica', 'bold').setFontSize(13.5)
  d.text('ANÁLISE COMPARATIVA DE CENÁRIOS', ML + 45, 14)
  st(d, CINZA_D); d.setFont('helvetica', 'normal').setFontSize(7.5)
  d.text(study.ativo.nomeUsina || study.ativo.nomeEstudo || '—', ML + 45, 20)
  d.setFontSize(6.5)
  d.text(
    `${study.ativo.concessionaria || '—'}  ·  Emitido em ${dateStr}  ·  ${nCenarios} cenário${nCenarios > 1 ? 's' : ''}`,
    ML + 45, 25.5,
  )
  sf(d, GRAFITE); d.rect(0, 33.5, PW, 0.8, 'F')
  sf(d, VERDE);   d.rect(0, 34.3, PW, 0.4, 'F')
}

/* ── Cabeçalho Página 2 ── */
function drawPage2Header(d: jsPDF, study: Study) {
  sf(d, VERDE); d.rect(0, 0, PW, 2.5, 'F')
  sf(d, BRANCO); d.rect(0, 2.5, PW, 17, 'F')
  st(d, VERDE); d.setFont('helvetica', 'bold').setFontSize(8.5)
  d.text('SOLFUS', ML, 13.5)
  sf(d, GRAFITE); d.rect(ML + 19, 8, 0.6, 9, 'F')
  st(d, PRETO); d.setFont('helvetica', 'bold').setFontSize(9)
  d.text('ANÁLISE COMPARATIVA DE CENÁRIOS', ML + 23, 13.5)
  st(d, CINZA_D); d.setFont('helvetica', 'normal').setFontSize(6.5)
  d.text(study.ativo.nomeUsina || '—', PW - MR, 13.5, { align: 'right' })
  sf(d, GRAFITE); d.rect(0, 19.5, PW, 0.8, 'F')
  sf(d, VERDE);   d.rect(0, 20.3, PW, 0.3, 'F')
}

/* ── Gráfico de barras horizontal ── */
function drawBarChart(
  d: jsPDF, y: number,
  title: string,
  items: { label: string; value: number | null }[],
  fmtFn: (v: number) => string,
  colorFn: (i: number) => RGB,
  higherIsBetter = true,
): number {
  const ROW_H  = 8.5
  const GAP    = 2.5
  const LBL_W  = 54
  const BAR_MAX = CW - LBL_W - 40

  const rawVals = items.map(i => i.value ?? 0)
  const maxV    = Math.max(...rawVals.map(Math.abs), 1)

  st(d, PRETO); d.setFont('helvetica', 'bold').setFontSize(8)
  d.text(title.toUpperCase(), ML, y + 1.5)
  y += 7
  sf(d, VERDE); d.rect(ML, y - 2, CW, 0.5, 'F')
  y += 1

  items.forEach((item, i) => {
    const bw  = Math.max((Math.abs(item.value ?? 0) / maxV) * BAR_MAX, 1.5)
    const col = colorFn(i)
    const isB = higherIsBetter
      ? (item.value ?? -Infinity) === Math.max(...items.map(x => x.value ?? -Infinity))
      : (item.value ?? Infinity)  === Math.min(...items.map(x => x.value ?? Infinity))

    sf(d, i % 2 === 0 ? GRAFITE_L : BRANCO)
    d.rect(ML, y, CW, ROW_H, 'F')

    d.setFont('helvetica', isB ? 'bold' : 'normal').setFontSize(7.5)
    st(d, PRETO)
    const lbl = item.label.length > 26 ? item.label.slice(0, 24) + '…' : item.label
    d.text(lbl, ML + 3, y + ROW_H * 0.70)

    sf(d, col)
    d.rect(ML + LBL_W, y + 1.5, bw, ROW_H - 3, 'F')

    d.setFont('helvetica', 'bold').setFontSize(7)
    const valColor: RGB = item.value != null && item.value < 0 ? NEGATIVO : VERDE_D
    st(d, valColor)
    d.text(
      item.value != null ? fmtFn(item.value) : '—',
      ML + LBL_W + bw + 4, y + ROW_H * 0.70,
    )
    if (isB) { st(d, GRAFITE); d.text('★', ML + LBL_W + bw + 24, y + ROW_H * 0.70) }
    y += ROW_H + GAP
  })

  sf(d, BORDA); d.rect(ML, y, CW, 0.3, 'F')
  return y + 5
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export async function exportComparativoPDF(
  study: Study,
  scenarios: Scenario[],
): Promise<void> {
  const sc = scenarios.filter(s => s.results != null)
  if (sc.length === 0) { alert('Nenhum cenário com resultados para exportar.'); return }

  const d       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as D
  const now     = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')

  const bestVPL = [...sc].sort((a, b) => b.results!.vpl - a.results!.vpl)[0]
  const bestTIR = [...sc].filter(s => s.results!.tir != null)
    .sort((a, b) => b.results!.tir! - a.results!.tir!)[0]
  const bestPB  = [...sc].filter(s => s.results!.paybackSimples != null)
    .sort((a, b) => a.results!.paybackSimples! - b.results!.paybackSimples!)[0]

  /* ══ PÁGINA 1 ══════════════════════════════════════════════════ */
  await drawPage1Header(d, study, sc.length, dateStr)
  let y = 38

  /* Matriz executiva */
  y = sectionTitle(d, y, 'MATRIZ EXECUTIVA') + 5

  const matrixHead = [['Cenário', 'VPL (R$)', 'TIR (%)', 'Payback (anos)', 'Rec. Líq. Acum. (R$)']]
  const matrixRows = sc.map(s => {
    const r      = s.results!
    const isBest = s.id === bestVPL?.id
    return [
      { content: s.name,
        styles: isBest ? { fillColor: rgb3(VERDE_L), fontStyle: 'bold' as const, textColor: rgb3(VERDE_D) } : {} },
      { content: brl(r.vpl),
        styles: isBest ? { textColor: rgb3(VERDE_D), fontStyle: 'bold' as const } : {} },
      { content: r.tir != null ? num(r.tir, 2) + '%' : '—',
        styles: s.id === bestTIR?.id ? { textColor: rgb3(VERDE_D), fontStyle: 'bold' as const } : {} },
      { content: r.paybackSimples != null ? num(r.paybackSimples, 1) + ' a' : '—',
        styles: s.id === bestPB?.id ? { textColor: rgb3(VERDE_D), fontStyle: 'bold' as const } : {} },
      { content: brl(r.ebitdaAcumulado), styles: {} },
    ]
  })

  autoTable(d, {
    startY: y,
    head: matrixHead,
    body: matrixRows,
    theme: 'plain',
    headStyles: {
      fillColor: rgb3(VERDE), textColor: rgb3(BRANCO),
      fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 3.5,
    },
    bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 3.5 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 48 } },
    alternateRowStyles: { fillColor: rgb3(GRAFITE_L) },
    margin: { left: ML, right: MR },
    tableWidth: CW,
  })
  y = d.lastAutoTable.finalY + 7

  /* ── Melhor cenário identificado ──
   *
   * Layout: [acento esq 5.5mm] [nome cenário em ~56mm] [4 KPI cards]
   *
   * Cálculo das larguras:
   *   LEFT_RESERVED = 58mm  (5.5mm acento + 52.5mm nome)
   *   CARD_GAP      = 2mm
   *   kpiW          = floor((CW - 58 - 2*3) / 4) = floor(121/4) = 30mm
   *   kpiX0         = ML + 58 = 70mm
   *   Última borda  = 70 + 4*30 + 3*2 = 196mm  (< 198mm = PW-MR)  ✓
   */
  if (bestVPL) {
    const BOX_H        = 26
    const LEFT_RESERVED = 58                              // mm para nome
    const CARD_GAP      = 2                               // gap entre cards
    const N_CARDS       = 4
    const kpiW          = Math.floor((CW - LEFT_RESERVED - CARD_GAP * (N_CARDS - 1)) / N_CARDS)  // 30mm
    const kpiX0         = ML + LEFT_RESERVED              // 70mm

    /* Moldura externa */
    sf(d, VERDE_L); sd(d, VERDE); d.setLineWidth(0.4)
    d.roundedRect(ML, y, CW, BOX_H, 2, 2, 'FD')

    /* Acentos verticais à esquerda */
    sf(d, VERDE);   d.rect(ML, y, 3.5, BOX_H, 'F')
    sf(d, GRAFITE); d.rect(ML + 3.5, y, 2, BOX_H, 'F')

    /* Título + nome do cenário */
    d.setFont('helvetica', 'bold').setFontSize(6.5); st(d, CINZA_D)
    d.text('MELHOR CENÁRIO IDENTIFICADO', ML + 9, y + 7)
    d.setFont('helvetica', 'bold').setFontSize(10.5); st(d, VERDE_D)
    const nomeText = bestVPL.name.length > 22 ? bestVPL.name.slice(0, 20) + '…' : bestVPL.name
    d.text(nomeText, ML + 9, y + 18)

    /* 4 KPI cards — alinhados à direita dentro da moldura */
    const kpiDefs = [
      { l: 'VPL',       v: brl(bestVPL.results!.vpl) },
      { l: 'TIR',       v: bestVPL.results!.tir != null ? num(bestVPL.results!.tir, 2) + '% a.a.' : '—' },
      { l: 'Payback',   v: bestVPL.results!.paybackSimples != null ? num(bestVPL.results!.paybackSimples, 1) + ' a' : '—' },
      { l: 'Rec.L.Ac.', v: brl(bestVPL.results!.ebitdaAcumulado) },
    ]

    kpiDefs.forEach(({ l, v }, i) => {
      const bx = kpiX0 + i * (kpiW + CARD_GAP)
      sf(d, BRANCO); sd(d, BORDA); d.setLineWidth(0.25)
      d.roundedRect(bx, y + 3.5, kpiW, BOX_H - 7, 1.5, 1.5, 'FD')
      d.setFont('helvetica', 'normal').setFontSize(5.5); st(d, CINZA_D)
      d.text(l.toUpperCase(), bx + kpiW / 2, y + 10, { align: 'center' })
      d.setFont('helvetica', 'bold').setFontSize(6.5); st(d, VERDE_D)
      // Truncar valor longo se necessário
      const vStr = v.length > 14 ? v.slice(0, 13) + '…' : v
      d.text(vStr, bx + kpiW / 2, y + 18.5, { align: 'center' })
    })

    y += BOX_H + 7
  }

  /* Tabela comparativa completa */
  y = sectionTitle(d, y, 'COMPARATIVO DE INDICADORES') + 5

  const metrics: {
    label: string
    get: (r: NonNullable<typeof sc[0]['results']>) => number | null
    fmt: string
    higher: boolean
  }[] = [
    { label: 'VPL (R$)',                   get: r => r.vpl,               fmt: 'brl',  higher: true  },
    { label: 'TIR (%)',                    get: r => r.tir,               fmt: 'pct',  higher: true  },
    { label: 'Payback Simples (anos)',     get: r => r.paybackSimples,    fmt: 'anos', higher: false },
    { label: 'Payback Descontado (anos)', get: r => r.paybackDescontado, fmt: 'anos', higher: false },
    { label: 'CAPEX (R$)',                 get: r => r.capex,             fmt: 'brl',  higher: false },
    { label: 'Rec. Líq. Acumulada (R$)',  get: r => r.ebitdaAcumulado,   fmt: 'brl',  higher: true  },
    { label: 'Rec. Bruta Acumulada (R$)', get: r => r.receitaAcumulada,  fmt: 'brl',  higher: true  },
    { label: 'Geração Anual (MWh)',        get: r => r.geracaoAnual,      fmt: 'mwh',  higher: true  },
  ]

  type CellDef = { content: string; styles?: Record<string, unknown> }
  const indBody: CellDef[][] = metrics.map(m => {
    const vals = sc.map(s => m.get(s.results!))
    const best = m.higher
      ? Math.max(...vals.filter((v): v is number => v != null))
      : Math.min(...vals.filter((v): v is number => v != null))
    return [
      { content: m.label, styles: { halign: 'left' } },
      ...sc.map(s => {
        const v   = m.get(s.results!)
        const isB = v != null && v === best
        return {
          content: fmtV(v, m.fmt),
          styles: isB
            ? { textColor: rgb3(VERDE_D), fontStyle: 'bold' as const, fillColor: rgb3(VERDE_L) }
            : { halign: 'center' },
        }
      }),
    ]
  })

  autoTable(d, {
    startY: y,
    head: [['Indicador', ...sc.map(s => s.name)]],
    body: indBody,
    theme: 'plain',
    headStyles: {
      fillColor: rgb3(GRAFITE), textColor: rgb3(BRANCO),
      fontStyle: 'bold', fontSize: 7.5, halign: 'center', cellPadding: 3.5,
    },
    bodyStyles: { fontSize: 7.5, halign: 'center', cellPadding: 3.5 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 } },
    alternateRowStyles: { fillColor: rgb3(CINZA_B) },
    margin: { left: ML, right: MR },
    tableWidth: CW,
  })

  drawFooter(d, 1, 2)

  /* ══ PÁGINA 2 ══════════════════════════════════════════════════ */
  d.addPage()
  drawPage2Header(d, study)
  y = 25

  y = sectionTitle(d, y, 'GRÁFICOS COMPARATIVOS') + 6

  const CHARTS = [
    {
      title: 'VPL POR CENÁRIO (R$)',
      get:   (r: NonNullable<typeof sc[0]['results']>) => r.vpl,
      fmt:   (v: number) => brl(v),
      higher: true,
    },
    {
      title: 'TIR POR CENÁRIO (%)',
      get:   (r: NonNullable<typeof sc[0]['results']>) => r.tir,
      fmt:   (v: number) => num(v, 2) + '%',
      higher: true,
    },
    {
      title: 'PAYBACK SIMPLES (ANOS)',
      get:   (r: NonNullable<typeof sc[0]['results']>) => r.paybackSimples,
      fmt:   (v: number) => num(v, 1) + ' a',
      higher: false,
    },
    {
      title: 'RECEITA LÍQUIDA ACUMULADA (R$)',
      get:   (r: NonNullable<typeof sc[0]['results']>) => r.ebitdaAcumulado,
      fmt:   (v: number) => brl(v),
      higher: true,
    },
  ]

  for (const chart of CHARTS) {
    y = drawBarChart(
      d, y, chart.title,
      sc.map(s => ({ label: s.name, value: chart.get(s.results!) })),
      chart.fmt, scenarioColor, chart.higher,
    )
  }

  /* Parecer executivo */
  y = sectionTitle(d, y, 'PARECER EXECUTIVO') + 5

  const parecerLines: string[] = []
  if (bestVPL) {
    parecerLines.push(
      `O cenário "${bestVPL.name}" apresentou o maior retorno financeiro, com VPL de ${brl(bestVPL.results!.vpl)}` +
      (bestVPL.results!.tir != null ? ` e TIR de ${num(bestVPL.results!.tir, 2)}% a.a.` : '') + '.',
    )
  }
  if (bestTIR && bestTIR.id !== bestVPL?.id) {
    parecerLines.push(`A maior TIR foi identificada em "${bestTIR.name}", com ${num(bestTIR.results!.tir!, 2)}% a.a.`)
  }
  if (bestPB) {
    parecerLines.push(
      `O menor prazo de retorno foi observado em "${bestPB.name}", com payback de ${num(bestPB.results!.paybackSimples!, 1)} anos.`,
    )
  }
  if (sc.length > 1) {
    const worst = [...sc].sort((a, b) => a.results!.vpl - b.results!.vpl)[0]
    parecerLines.push(
      `O cenário "${worst.name}" apresentou o menor VPL (${brl(worst.results!.vpl)}), indicando premissas mais conservadoras.`,
    )
  }
  parecerLines.push('Recomenda-se análise complementar de sensibilidade antes da decisão de investimento.')

  const parecerH = 26
  sf(d, VERDE_L); sd(d, VERDE); d.setLineWidth(0.35)
  d.roundedRect(ML, y, CW, parecerH, 2, 2, 'FD')
  sf(d, VERDE);   d.rect(ML, y, 3.5, parecerH, 'F')
  sf(d, GRAFITE); d.rect(ML + 3.5, y, 2, parecerH, 'F')
  st(d, PRETO); d.setFont('helvetica', 'normal').setFontSize(7.5)
  const split = d.splitTextToSize(parecerLines.join(' '), CW - 14)
  d.text(split, ML + 9, y + 7)

  drawFooter(d, 2, 2)

  /* ── Save ── */
  const safe = (study.ativo.nomeUsina || study.ativo.nomeEstudo || 'USINA')
    .toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-')
  d.save(`COMPARATIVO_${safe}_${now.toISOString().slice(0, 10)}.pdf`)
}
