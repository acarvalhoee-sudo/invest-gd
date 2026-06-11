/**
 * pdfGenerator.ts
 * Gerador de PDF profissional usando jsPDF + jspdf-autotable
 *
 * Estrutura do documento:
 * 1. Capa
 * 2. Premissas (tarifas, impostos, premissas financeiras)
 * 3. Resumo Executivo (indicadores)
 * 4. Tabela de Fluxo de Caixa
 * 5. Conclusão (VIÁVEL / NÃO VIÁVEL)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Estudo, ResultadosEstudo } from '../types/studyTypes'
import { FONTE_LABELS } from '../types/studyTypes'
import { formatBRL, formatPct, formatPayback, formatMWh } from '../calculations/viabilityEngine'

// ─── Paleta de cores ──────────────────────────

const CORES = {
  primario:    [3, 105, 161]  as [number, number, number], // primary-700
  primarioClaro: [186, 230, 253] as [number, number, number], // primary-200
  sucesso:     [21, 128, 61]  as [number, number, number], // success-700
  perigo:      [185, 28, 28]  as [number, number, number], // danger-700
  cinzaEscuro: [30, 41, 59]   as [number, number, number],
  cinzaMedio:  [100, 116, 139] as [number, number, number],
  cinzaClaro:  [241, 245, 249] as [number, number, number],
  branco:      [255, 255, 255] as [number, number, number],
}

// ─── Helpers ──────────────────────────────────

function hex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function addHeader(doc: jsPDF, titulo: string, pagina: number) {
  // Barra superior
  doc.setFillColor(...CORES.primario)
  doc.rect(0, 0, 210, 14, 'F')
  doc.setTextColor(...CORES.branco)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('INVEST GD – Viabilidade de Geração Distribuída', 14, 9)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, 196, 9, { align: 'right' })

  // Linha inferior do header
  doc.setDrawColor(...CORES.primarioClaro)
  doc.setLineWidth(0.5)
  doc.line(0, 14, 210, 14)
}

function addFooter(doc: jsPDF, pagina: number, total: number) {
  const y = 290
  doc.setDrawColor(...CORES.cinzaClaro)
  doc.setLineWidth(0.3)
  doc.line(14, y, 196, y)
  doc.setFontSize(8)
  doc.setTextColor(...CORES.cinzaMedio)
  doc.setFont('helvetica', 'normal')
  doc.text('INVEST GD © SOLFUS – Documento gerado automaticamente. Valores meramente indicativos.', 14, y + 5)
  doc.text(`Página ${pagina} / ${total}`, 196, y + 5, { align: 'right' })
}

function addSectionTitle(doc: jsPDF, titulo: string, y: number): number {
  doc.setFillColor(...CORES.cinzaClaro)
  doc.roundedRect(14, y, 182, 8, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.primario)
  doc.text(titulo.toUpperCase(), 18, y + 5.5)
  return y + 12
}

// ─── Gerador principal ────────────────────────

export async function gerarPDF(estudo: Estudo, result: ResultadosEstudo): Promise<void> {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { dadosUsina, premissas, parametros } = estudo
  const { indicadores, fluxoCaixa } = result
  const isViavel = indicadores.viabilidade === 'VIÁVEL'
  const nomeArquivo = `${dadosUsina.nomeUsina.replace(/[^a-zA-Z0-9]/g, '_')}_Viabilidade.pdf`

  // ═══════════════════════════════════════════
  // PÁGINA 1 – CAPA
  // ═══════════════════════════════════════════

  // Fundo gradiente simulado
  doc.setFillColor(...CORES.primario)
  doc.rect(0, 0, 210, 297, 'F')

  // Painel branco central
  doc.setFillColor(...CORES.branco)
  doc.roundedRect(20, 40, 170, 200, 6, 6, 'F')

  // Logo / título do sistema
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.primario)
  doc.text('INVEST GD', 105, 62, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CORES.cinzaMedio)
  doc.text('Estudo de Viabilidade Econômico-Financeira', 105, 70, { align: 'center' })

  // Linha divisória
  doc.setDrawColor(...CORES.primarioClaro)
  doc.setLineWidth(0.5)
  doc.line(40, 75, 170, 75)

  // Dados da usina
  const dados: [string, string][] = [
    ['Nome da Usina',     dadosUsina.nomeUsina],
    ['Fonte',            FONTE_LABELS[dadosUsina.fonte]],
    ['Potência',         `${dadosUsina.potencia.toLocaleString('pt-BR')} ${dadosUsina.fonte === 'solar' ? 'kWp' : 'kW'}`],
    ['Investimento',     formatBRL(indicadores.investimentoTotal, 0)],
    ['Período',          `${parametros.anoInicial} – ${parametros.anoFinal}`],
    ['Tipo de GD',       dadosUsina.tipoGD],
  ]

  let yy = 90
  dados.forEach(([label, valor]) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CORES.cinzaMedio)
    doc.text(label.toUpperCase(), 35, yy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...CORES.cinzaEscuro)
    doc.text(valor, 35, yy + 7)
    yy += 18
  })

  // Badge de viabilidade
  const badgeColor = isViavel ? CORES.sucesso : CORES.perigo
  doc.setFillColor(...badgeColor)
  doc.roundedRect(55, 195, 100, 28, 5, 5, 'F')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.branco)
  doc.text(indicadores.viabilidade, 105, 212, { align: 'center' })

  // Rodapé da capa
  doc.setFontSize(8)
  doc.setTextColor(...CORES.branco)
  doc.setFont('helvetica', 'normal')
  const hoje = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  doc.text(`Gerado em ${hoje}`, 105, 270, { align: 'center' })

  // ═══════════════════════════════════════════
  // PÁGINA 2 – PREMISSAS
  // ═══════════════════════════════════════════

  doc.addPage()
  addHeader(doc, 'Premissas', 2)
  addFooter(doc, 2, 4)

  let y = 22
  y = addSectionTitle(doc, '1. Tarifas de Energia', y)

  autoTable(doc, {
    startY: y,
    head: [['Tarifa', 'Valor']],
    body: [
      ['TE Ponta',          `R$ ${premissas.tarifas.tePonta.toFixed(2)}/MWh`],
      ['TE Fora Ponta',     `R$ ${premissas.tarifas.teFp.toFixed(2)}/MWh`],
      ['TUSD Ponta',        `R$ ${premissas.tarifas.tusdPonta.toFixed(2)}/MWh`],
      ['TUSD Fora Ponta',   `R$ ${premissas.tarifas.tusdFp.toFixed(2)}/MWh`],
      ['TUSD Geração',      `R$ ${premissas.tarifas.tusdGeracao.toFixed(2)}/MWh`],
      ['Tarifa Demanda',    `R$ ${premissas.tarifas.tarifaDemanda.toFixed(2)}/kW`],
      ['Distribuidora',     premissas.tarifas.distribuidora || '—'],
      ['Subgrupo',          premissas.tarifas.subgrupo],
      ['Modalidade',        premissas.tarifas.modalidade],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: CORES.primario, textColor: CORES.branco, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: CORES.cinzaClaro },
    margin: { left: 14, right: 14 },
    tableWidth: 85,
  })

  const afterTarifas = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

  autoTable(doc, {
    startY: afterTarifas,
    head: [['Imposto', 'Alíquota', 'Status']],
    body: [
      ['PIS',    `${premissas.impostos.pis}%`,    premissas.impostos.habPis    ? 'Ativo' : 'Inativo'],
      ['COFINS', `${premissas.impostos.cofins}%`, premissas.impostos.habCofins ? 'Ativo' : 'Inativo'],
      ['ICMS',   `${premissas.impostos.icms}%`,   premissas.impostos.habIcms   ? 'Ativo' : 'Inativo'],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: CORES.primario, textColor: CORES.branco, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: CORES.cinzaClaro },
    margin: { left: 14, right: 14 },
    tableWidth: 85,
  })

  // Premissas financeiras – coluna direita
  autoTable(doc, {
    startY: 34,
    head: [['Premissa Financeira', 'Valor']],
    body: [
      ['Reajuste Anual',        `${premissas.financeiras.reajusteAnual}% a.a.`],
      ['Manutenção',            `${premissas.financeiras.manutencao}% do invest.`],
      ['Gestão Variável',       `${premissas.financeiras.gestaoVariavel}% da receita`],
      ['IPCA',                  `${premissas.financeiras.ipca}% a.a.`],
      ['Gestão Fixa Mensal',    formatBRL(premissas.financeiras.gestaoFixaMensal)],
      ['SELIC',                 `${premissas.financeiras.selic}% a.a.`],
      ['TMA',                   `${premissas.financeiras.tma}% a.a.`],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: CORES.primario, textColor: CORES.branco, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: CORES.cinzaClaro },
    margin: { left: 111, right: 14 },
    tableWidth: 85,
  })

  // ═══════════════════════════════════════════
  // PÁGINA 3 – RESUMO EXECUTIVO + FLUXO
  // ═══════════════════════════════════════════

  doc.addPage()
  addHeader(doc, 'Resumo Executivo', 3)
  addFooter(doc, 3, 4)

  y = 22
  y = addSectionTitle(doc, '2. Resumo Executivo', y)

  // Cards de indicadores
  const cards: [string, string, boolean][] = [
    ['VPL',                   formatBRL(indicadores.vpl, 0),              true],
    ['TIR',                   formatPct(indicadores.tir),                 true],
    ['Investimento Total',    formatBRL(indicadores.investimentoTotal, 0), false],
    ['Payback Simples',       formatPayback(indicadores.paybackSimples),   false],
    ['Payback Descontado',    formatPayback(indicadores.paybackDescontado), false],
    ['TMA',                   formatPct(premissas.financeiras.tma),        false],
    ['SELIC',                 formatPct(premissas.financeiras.selic),      false],
    ['Produção Anual Média',  formatMWh(indicadores.producaoAnualMedia),   false],
    ['Receita Média Anual',   formatBRL(indicadores.receitaMedia, 0),      false],
    ['Fluxo Médio Anual',     formatBRL(indicadores.fluxoMedio, 0),        false],
  ]

  const COLS = 3
  const cardW = 58, cardH = 18, marginX = 14, gapX = 3, gapY = 3
  cards.forEach(([ label, valor, highlight ], i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx  = marginX + col * (cardW + gapX)
    const cy  = y + row * (cardH + gapY)
    doc.setFillColor(highlight ? CORES.primario[0] : CORES.cinzaClaro[0],
                     highlight ? CORES.primario[1] : CORES.cinzaClaro[1],
                     highlight ? CORES.primario[2] : CORES.cinzaClaro[2])
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(highlight ? 186 : CORES.cinzaMedio[0],
                     highlight ? 230 : CORES.cinzaMedio[1],
                     highlight ? 253 : CORES.cinzaMedio[2])
    doc.text(label.toUpperCase(), cx + 3, cy + 5)
    doc.setFontSize(highlight ? 12 : 10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(highlight ? 255 : CORES.cinzaEscuro[0],
                     highlight ? 255 : CORES.cinzaEscuro[1],
                     highlight ? 255 : CORES.cinzaEscuro[2])
    doc.text(valor, cx + 3, cy + 13)
  })

  y += Math.ceil(cards.length / COLS) * (cardH + gapY) + 6

  y = addSectionTitle(doc, '3. Fluxo de Caixa', y)

  // Tabela de fluxo de caixa (resumida para caber no PDF)
  autoTable(doc, {
    startY: y,
    head: [['Ano', 'Meses', 'Produção\n(MWh)', 'Receita', 'Total Saídas', 'FC Líquido', 'FC Acumulado', 'FC Desc. Acum.', 'Rent.%']],
    body: fluxoCaixa.map((l, idx) => [
      idx === 0 ? 'Ano 0' : l.ano.toString(),
      idx === 0 ? '—' : l.meses.toString(),
      idx === 0 ? '—' : l.producao.toFixed(1),
      idx === 0 ? '—' : formatBRL(l.receita, 0),
      idx === 0 ? '—' : formatBRL(l.totalSaidas, 0),
      formatBRL(l.fluxoCaixa, 0),
      formatBRL(l.fluxoAcumulado, 0),
      formatBRL(l.fluxoDescontadoAcumulado, 0),
      idx === 0 ? '—' : `${l.rentabilidade.toFixed(1)}%`,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: CORES.primario, textColor: CORES.branco, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: CORES.cinzaClaro },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Colorir fluxo de caixa positivo/negativo
      if (data.section === 'body' && data.column.index === 5) {
        const val = parseFloat(String(data.cell.raw).replace(/[^0-9,-]/g, '').replace(',', '.'))
        if (!isNaN(val)) {
          data.cell.styles.textColor = val >= 0 ? CORES.sucesso : CORES.perigo
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // ═══════════════════════════════════════════
  // PÁGINA 4 – CONCLUSÃO
  // ═══════════════════════════════════════════

  doc.addPage()
  addHeader(doc, 'Conclusão', 4)
  addFooter(doc, 4, 4)

  y = 22
  y = addSectionTitle(doc, '4. Conclusão da Análise', y)

  // Box de conclusão
  const boxColor = isViavel ? CORES.sucesso : CORES.perigo
  doc.setFillColor(...boxColor)
  doc.roundedRect(14, y + 4, 182, 40, 5, 5, 'F')
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.branco)
  doc.text(indicadores.viabilidade, 105, y + 22, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const subtext = isViavel
    ? `VPL positivo de ${formatBRL(indicadores.vpl, 0)} e TIR de ${formatPct(indicadores.tir)} superior à TMA de ${formatPct(premissas.financeiras.tma)}`
    : `VPL de ${formatBRL(indicadores.vpl, 0)} ou TIR de ${formatPct(indicadores.tir)} inferior à TMA de ${formatPct(premissas.financeiras.tma)}`
  doc.text(subtext, 105, y + 34, { align: 'center' })

  y += 55

  // Texto de conclusão
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CORES.cinzaEscuro)
  const textoConc = isViavel
    ? `O estudo de viabilidade da ${dadosUsina.nomeUsina} (${FONTE_LABELS[dadosUsina.fonte]}, ${dadosUsina.potencia.toLocaleString('pt-BR')} ${dadosUsina.fonte === 'solar' ? 'kWp' : 'kW'}) demonstra que o projeto é ECONOMICAMENTE VIÁVEL no horizonte analisado (${parametros.anoInicial}–${parametros.anoFinal}). O Valor Presente Líquido positivo de ${formatBRL(indicadores.vpl, 0)} e a Taxa Interna de Retorno de ${formatPct(indicadores.tir)} superam a Taxa Mínima de Atratividade de ${formatPct(premissas.financeiras.tma)}, confirmando a atratividade do investimento de ${formatBRL(indicadores.investimentoTotal, 0)}. O payback simples estimado é de ${formatPayback(indicadores.paybackSimples)}.`
    : `O estudo de viabilidade da ${dadosUsina.nomeUsina} indica que, nas premissas adotadas, o projeto NÃO APRESENTA VIABILIDADE ECONÔMICA suficiente. Recomenda-se revisão das premissas de custo, tarifa ou período de análise.`

  const linhas = doc.splitTextToSize(textoConc, 182)
  doc.text(linhas, 14, y)

  // Salvar o PDF
  doc.save(nomeArquivo)
}
