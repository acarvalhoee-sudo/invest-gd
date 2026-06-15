/**
 * comparativoPdfService.ts — PDF Comparativo de Cenários
 * Gerado com jsPDF + jspdf-autotable (sem html2canvas).
 * Inclui: cabeçalho, matriz executiva, tabela completa,
 * gráficos de barra primitivos, parecer e conclusão.
 */
import jsPDF      from 'jspdf'
import autoTable  from 'jspdf-autotable'
import type { Scenario } from '@/types/scenario'
import type { Study }    from '@/types/study'

/* ── Paleta ── */
type RGB = [number, number, number]
const VERDE:   RGB = [11,  94, 59]
const VERDE_L: RGB = [232,245,238]
const LARANJA: RGB = [234, 88,  12]
const CINZA:   RGB = [100,116,139]
const CINZA_L: RGB = [241,245,249]
const BRANCO:  RGB = [255,255,255]
const PRETO:   RGB = [15,  23, 42]

const PW = 210, PH = 297, ML = 14, MR = 14
const CW = PW - ML - MR

type D = jsPDF

const sf = (d: D, c: RGB) => d.setFillColor(c[0],c[1],c[2])
const sd = (d: D, c: RGB) => d.setDrawColor(c[0],c[1],c[2])
const st = (d: D, c: RGB) => d.setTextColor(c[0],c[1],c[2])

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR',{maximumFractionDigits:0})
const num = (n: number, d = 2) => n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})

function fmtV(v: number | null | undefined, type: string): string {
  if (v == null) return '—'
  if (type === 'brl')  return brl(v)
  if (type === 'pct')  return num(v,2) + '%'
  if (type === 'anos') return num(v,1) + ' a'
  if (type === 'mwh')  return num(v,0) + ' MWh'
  return String(v)
}

/* ── Horizontal bar chart (primitive rects) ── */
function drawBarChart(
  d: D,
  y: number,
  title: string,
  items: { label: string; value: number | null }[],
  fmtFn: (v: number) => string,
  colorFn: (i: number, total: number) => RGB,
  higherIsBetter = true,
): number {
  const H    = 7.5    // bar height
  const GAP  = 4      // between bars
  const LW   = 46     // label width
  const BMAX = CW - LW - 30  // max bar width
  const vals = items.map(i => i.value ?? 0)
  const maxV = Math.max(...vals.map(Math.abs), 1)

  // Title
  d.setFont('helvetica','bold').setFontSize(9)
  st(d, PRETO)
  d.text(title.toUpperCase(), ML, y)
  y += 5

  // Underline
  sf(d, VERDE); d.rect(ML, y-1, 28, 1, 'F'); y += 3

  // Bars
  items.forEach((item, i) => {
    const bw   = Math.max((Math.abs(item.value ?? 0) / maxV) * BMAX, 1)
    const col  = colorFn(i, items.length)
    const isB  = higherIsBetter ? (item.value ?? -Infinity) === Math.max(...items.map(x => x.value ?? -Infinity)) :
                                  (item.value ?? Infinity)  === Math.min(...items.map(x => x.value ?? Infinity))

    // Label
    d.setFont('helvetica', isB ? 'bold' : 'normal').setFontSize(8)
    st(d, PRETO)
    const lbl = item.label.length > 20 ? item.label.slice(0,18)+'…' : item.label
    d.text(lbl, ML, y + H * 0.72)

    // Bar
    sf(d, col); sd(d, col)
    d.rect(ML + LW, y, bw, H, 'F')

    // Best indicator
    if (isB) {
      sf(d, VERDE_L); sd(d, VERDE)
      d.roundedRect(ML + LW + bw + 1, y + 1, 3, H - 2, 1, 1, 'FD')
    }

    // Value label
    d.setFont('helvetica','bold').setFontSize(7.5)
    st(d, item.value != null && item.value < 0 ? [220,30,30] : VERDE)
    d.text(item.value != null ? fmtFn(item.value) : '—', ML + LW + bw + 6, y + H * 0.72)

    y += H + GAP
  })
  return y + 4
}

/* ── Page header ── */
function pageHeader(d: D, study: Study, pageN: number) {
  // Green stripe
  sf(d, VERDE); d.rect(0,0,PW,14,'F')
  d.setFont('helvetica','bold').setFontSize(10)
  st(d, BRANCO)
  d.text('ANÁLISE COMPARATIVA DE CENÁRIOS', ML, 9)
  d.setFont('helvetica','normal').setFontSize(7)
  d.text(study.ativo.nomeUsina || study.ativo.nomeEstudo || '', PW - MR, 9, {align:'right'})
  d.setFontSize(7); st(d, [200,230,210])
  d.text(`Pág. ${pageN}`, PW - MR, 6, {align:'right'})
}

/* ── Color functions ── */
function scenarioColor(i: number, total: number): RGB {
  const palette: RGB[] = [VERDE, LARANJA, [100,116,139],[59,130,246],[168,85,247],[20,184,166]]
  return palette[i % palette.length]
}

/* ── MAIN EXPORT ── */
export async function exportComparativoPDF(
  study: Study,
  scenarios: Scenario[],
): Promise<void> {
  const sc = scenarios.filter(s => s.results != null)
  if (sc.length === 0) { alert('Nenhum cenário com resultados para exportar.'); return }

  const d   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  let y = 0
  let page = 1

  /* ══════════════════════════════════════
     PAGE 1 — CABEÇALHO + MATRIZ + TABELA
  ══════════════════════════════════════ */

  // ── Full header block ─────────────────
  sf(d, VERDE); d.rect(0,0,PW,42,'F')

  // Logo placeholder (white box)
  sf(d, BRANCO); d.rect(ML,5,28,22,'F')
  d.setFont('helvetica','bold').setFontSize(11); st(d,[11,94,59])
  d.text('SOLFUS', ML+14, 18, {align:'center'})
  d.setFont('helvetica','normal').setFontSize(6.5); st(d,[11,94,59])
  d.text('ENERGIA', ML+14, 22, {align:'center'})

  // Title area
  d.setFont('helvetica','bold').setFontSize(16); st(d, BRANCO)
  d.text('ANÁLISE COMPARATIVA', ML+34, 14)
  d.text('DE CENÁRIOS', ML+34, 21)
  d.setFont('helvetica','normal').setFontSize(8); st(d,[200,230,210])
  d.text(study.ativo.nomeUsina || study.ativo.nomeEstudo || 'Estudo sem nome', ML+34, 28)
  d.text(`Emitido em: ${dateStr}  |  ${sc.length} cenário${sc.length>1?'s':''} analisado${sc.length>1?'s':''}`, ML+34, 33)

  // Orange accent bar
  sf(d, LARANJA); d.rect(0,42,PW,2,'F')
  y = 50

  // ── Matriz executiva ──────────────────
  d.setFont('helvetica','bold').setFontSize(10); st(d, PRETO)
  d.text('MATRIZ EXECUTIVA', ML, y); y += 5
  sf(d, VERDE); d.rect(ML, y-1, 36, 1,'F'); y += 4

  const bestVPL = [...sc].sort((a,b)=>(b.results!.vpl)-(a.results!.vpl))[0]
  const bestTIR = [...sc].filter(s=>s.results!.tir!=null).sort((a,b)=>b.results!.tir!-a.results!.tir!)[0]
  const bestPB  = [...sc].filter(s=>s.results!.paybackSimples!=null).sort((a,b)=>a.results!.paybackSimples!-b.results!.paybackSimples!)[0]

  const matrixHead = [['Cenário','VPL (R$)','TIR (%)','Payback (anos)','Rec. Líq. Acumulada (R$)']]
  const matrixRows = sc.map(s => {
    const r = s.results!
    const isBest = s.id === bestVPL?.id
    return [
      { content: s.name, styles: isBest ? {fillColor:[232,245,238] as [number,number,number], fontStyle:'bold' as const, textColor:[11,94,59] as [number,number,number]} : {} },
      { content: brl(r.vpl), styles: isBest ? {textColor:[11,94,59] as [number,number,number], fontStyle:'bold' as const} : {} },
      { content: r.tir!=null ? num(r.tir,2)+'%' : '—', styles: s.id===bestTIR?.id ? {textColor:[11,94,59] as [number,number,number], fontStyle:'bold' as const} : {} },
      { content: r.paybackSimples!=null ? num(r.paybackSimples,1)+' a' : '—', styles: s.id===bestPB?.id ? {textColor:[11,94,59] as [number,number,number], fontStyle:'bold' as const} : {} },
      { content: brl(r.ebitdaAcumulado), styles: {} },
    ]
  })

  autoTable(d, {
    startY: y,
    head: matrixHead,
    body: matrixRows,
    theme:'grid',
    headStyles:{ fillColor:VERDE, textColor:BRANCO, fontStyle:'bold', fontSize:8, halign:'center' },
    bodyStyles:{ fontSize:8, halign:'center' },
    columnStyles:{ 0:{ halign:'left', fontStyle:'bold' } },
    margin:{ left:ML, right:MR },
    tableWidth: CW,
  })
  y = (d as any).lastAutoTable.finalY + 8

  // ── Tabela completa de indicadores ───
  d.setFont('helvetica','bold').setFontSize(10); st(d, PRETO)
  d.text('COMPARATIVO DE INDICADORES', ML, y); y += 5
  sf(d, LARANJA); d.rect(ML, y-1, 46, 1,'F'); y += 3

  const indHead = [['Indicador', ...sc.map(s=>s.name)]]
  type CellDef = { content: string; styles?: Record<string, unknown> }
  const metrics: { label:string; get:(r:NonNullable<typeof sc[0]['results']>)=>number|null; fmt:string; higher:boolean }[] = [
    { label:'VPL (R$)',                  get:r=>r.vpl,                fmt:'brl',  higher:true  },
    { label:'TIR (%)',                   get:r=>r.tir,                fmt:'pct',  higher:true  },
    { label:'Payback Simples (anos)',    get:r=>r.paybackSimples,     fmt:'anos', higher:false },
    { label:'Payback Descontado (anos)', get:r=>r.paybackDescontado,  fmt:'anos', higher:false },
    { label:'CAPEX (R$)',                get:r=>r.capex,              fmt:'brl',  higher:false },
    { label:'Receita Líq. Acumulada',   get:r=>r.receitaAcumulada,   fmt:'brl',  higher:true  },
    { label:'EBITDA Total (R$)',         get:r=>r.ebitdaAcumulado,    fmt:'brl',  higher:true  },
    { label:'Geração Anual (MWh)',       get:r=>r.geracaoAnual,       fmt:'mwh',  higher:true  },
  ]
  const indBody: CellDef[][] = metrics.map(m => {
    const vals = sc.map(s=>m.get(s.results!))
    const best = m.higher
      ? Math.max(...vals.filter((v):v is number=>v!=null))
      : Math.min(...vals.filter((v):v is number=>v!=null))
    return [
      { content: m.label, styles:{ fontStyle:'bold', halign:'left' } },
      ...sc.map(s => {
        const v = m.get(s.results!)
        const isB = v != null && v === best
        return { content: fmtV(v, m.fmt), styles: isB ? { textColor:[11,94,59], fontStyle:'bold', fillColor:[232,245,238] } : { halign:'center' } }
      }),
    ]
  })

  autoTable(d, {
    startY: y,
    head: indHead,
    body: indBody,
    theme:'striped',
    headStyles:{ fillColor:[30,41,59], textColor:BRANCO, fontStyle:'bold', fontSize:7.5, halign:'center' },
    bodyStyles:{ fontSize:7.5, halign:'center' },
    columnStyles:{ 0:{ halign:'left', fontStyle:'bold', cellWidth:54 } },
    alternateRowStyles:{ fillColor:[248,250,252] },
    margin:{ left:ML, right:MR },
    tableWidth: CW,
  })
  y = (d as any).lastAutoTable.finalY + 6

  /* ══════════════════════════════════════
     PAGE 2 — GRÁFICOS
  ══════════════════════════════════════ */
  d.addPage(); page++
  pageHeader(d, study, page); y = 18

  const CHARTS: { title:string; get:(r:NonNullable<typeof sc[0]['results']>)=>number|null; fmt:(v:number)=>string; higher:boolean }[] = [
    { title:'VPL por Cenário (R$)',                get:r=>r.vpl,              fmt:v=>brl(v),         higher:true  },
    { title:'TIR por Cenário (%)',                  get:r=>r.tir,              fmt:v=>num(v,2)+'%',   higher:true  },
    { title:'Payback Simples (anos)',               get:r=>r.paybackSimples,   fmt:v=>num(v,1)+' a',  higher:false },
    { title:'Receita Líq. Acumulada (R$)',          get:r=>r.ebitdaAcumulado,  fmt:v=>brl(v),         higher:true  },
    { title:'Receita Bruta Acumulada (R$)',         get:r=>r.receitaAcumulada, fmt:v=>brl(v),         higher:true  },
  ]

  for (const chart of CHARTS) {
    const items = sc.map(s => ({ label:s.name, value:chart.get(s.results!) }))
    if (y + sc.length * 12 + 14 > PH - 20) {
      d.addPage(); page++
      pageHeader(d, study, page); y = 18
    }
    y = drawBarChart(d, y, chart.title, items, chart.fmt, scenarioColor, chart.higher)
    y += 2
    // Separator line
    sd(d, CINZA_L); d.setLineWidth(0.2); d.line(ML, y, PW-MR, y); y += 5
  }

  /* ══════════════════════════════════════
     PAGE 3 — PARECER + CONCLUSÃO
  ══════════════════════════════════════ */
  d.addPage(); page++
  pageHeader(d, study, page); y = 20

  // ── Parecer executivo ─────────────────
  sf(d, VERDE); d.rect(ML, y, 3, 20,'F')
  d.setFont('helvetica','bold').setFontSize(10); st(d, VERDE)
  d.text('PARECER EXECUTIVO', ML+6, y+7)
  d.setFont('helvetica','normal').setFontSize(9); st(d, PRETO)

  // Auto-generate parecer text
  const parecerLines: string[] = []
  if (bestVPL) {
    parecerLines.push(`O cenário "${bestVPL.name}" apresentou o maior retorno financeiro, com VPL de ${brl(bestVPL.results!.vpl)}${bestVPL.results!.tir!=null?' e TIR de '+num(bestVPL.results!.tir,2)+'% a.a.':''}.`)
  }
  if (bestTIR && bestTIR.id !== bestVPL?.id) {
    parecerLines.push(`A maior TIR foi identificada no cenário "${bestTIR.name}", com ${num(bestTIR.results!.tir!,2)}% a.a.`)
  }
  if (bestPB) {
    parecerLines.push(`O menor prazo de retorno foi observado em "${bestPB.name}", com payback de ${num(bestPB.results!.paybackSimples!,1)} anos.`)
  }
  if (sc.length > 1) {
    const worst = [...sc].sort((a,b)=>a.results!.vpl-b.results!.vpl)[0]
    parecerLines.push(`O cenário "${worst.name}" apresentou o menor VPL (${brl(worst.results!.vpl)}), indicando maior conservadorismo nas premissas adotadas.`)
  }
  parecerLines.push('Os resultados acima consideram as premissas individuais de cada cenário. Recomenda-se análise complementar de sensibilidade antes da decisão de investimento.')

  const parecerText = parecerLines.join(' ')
  const split = d.splitTextToSize(parecerText, CW - 12)
  d.text(split, ML+6, y+14)
  y += 14 + split.length * 4.5 + 8

  // ── Conclusão ─────────────────────────
  const best = bestVPL
  if (best) {
    sf(d, VERDE_L); sd(d, VERDE); d.setLineWidth(0.5)
    d.roundedRect(ML, y, CW, 44, 3, 3, 'FD')

    // Trophy badge
    sf(d, VERDE); d.circle(ML+13, y+12, 8, 'F')
    d.setFont('helvetica','bold').setFontSize(14); st(d, BRANCO)
    d.text('★', ML+13, y+15.5, {align:'center'})

    d.setFont('helvetica','bold').setFontSize(11); st(d, VERDE)
    d.text('MELHOR CENÁRIO IDENTIFICADO', ML+26, y+9)
    d.setFont('helvetica','bold').setFontSize(16); st(d, [15,41,23])
    d.text(best.name, ML+26, y+18)

    // KPIs
    const kpis = [
      ['VPL',     brl(best.results!.vpl)],
      ['TIR',     best.results!.tir!=null ? num(best.results!.tir,2)+'% a.a.' : '—'],
      ['Payback', best.results!.paybackSimples!=null ? num(best.results!.paybackSimples,1)+' anos' : '—'],
      ['EBITDA Total', brl(best.results!.ebitdaAcumulado)],
    ]
    kpis.forEach(([lbl,val], i) => {
      const bx = ML + 2 + i * (CW/4)
      sf(d, BRANCO); d.roundedRect(bx, y+24, CW/4-4, 14, 2, 2, 'F')
      d.setFont('helvetica','normal').setFontSize(6.5); st(d, CINZA)
      d.text(lbl.toUpperCase(), bx+(CW/4-4)/2, y+30, {align:'center'})
      d.setFont('helvetica','bold').setFontSize(8.5); st(d, VERDE)
      d.text(val, bx+(CW/4-4)/2, y+36, {align:'center'})
    })
    y += 52
  }

  // ── Rodapé final ──────────────────────
  sf(d, VERDE); d.rect(0, PH-12, PW, 12, 'F')
  d.setFont('helvetica','bold').setFontSize(8); st(d, BRANCO)
  d.text('SOLFUS Engenharia e Conservação de Energia', PW/2, PH-5.5, {align:'center'})
  d.setFont('helvetica','normal').setFontSize(6.5); st(d,[200,230,210])
  d.text(`Emitido em ${dateStr} — INVEST GD`, PW/2, PH-2, {align:'center'})

  // ── Save ──────────────────────────────
  const safe = (study.ativo.nomeUsina || study.ativo.nomeEstudo || 'USINA')
    .toUpperCase().replace(/[^A-Z0-9]/g,'-').replace(/-+/g,'-')
  const date = now.toISOString().slice(0,10)
  d.save(`COMPARATIVO_${safe}_${date}.pdf`)
}
