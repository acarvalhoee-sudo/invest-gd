/**
 * RelatorioExecutivoTab.tsx — v10
 */
import { useMemo } from 'react'
import {
  AreaChart, Area, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { FONTE_LABELS } from '@/types/study'
import type { Study } from '@/types/study'
import type { ResultadosFinanceiros } from '@/types/results'
import { fmtBRL, fmtNum } from '@/utils/formatters'

const V   = '#0B5E3B'
const VL  = '#f0fdf4'
const OR  = '#ea580c'
const ORL = '#fff7ed'
const V2  = '#094d30'
const SL  = '#64748b'

function fmtM(n: number) {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(2)}M`
  if (a >= 1_000)     return `${s}${(a / 1_000).toFixed(0)}K`
  return fmtBRL(n, 0)
}

const IcoBar   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
const IcoPct   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><line x1="5" y1="19" x2="19" y2="5"/></svg>
const IcoClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
const IcoDollar= () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const IcoCoins = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/></svg>
const IcoLight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IcoCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
const IcoTrophy= () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 9H3V4h18v5h-3"/><path d="M12 18v3"/><path d="M8 21h8"/><path d="M6 4c0 6 2 9 6 9s6-3 6-9"/></svg>

function KpiCard({label,value,sub,icon,color}:{label:string;value:string;sub:string;icon:React.ReactNode;color:string}) {
  return (
    <div style={{flex:1,background:'white',borderRadius:10,border:'1px solid #e2e8f0',borderTop:`3px solid ${color}`,padding:'14px 10px',display:'flex',flexDirection:'column',alignItems:'center',gap:6,boxShadow:'0 1px 4px rgba(0,0,0,.05)',minWidth:0}}>
      <div style={{color,marginBottom:2}}>{icon}</div>
      <p style={{fontSize:8.5,fontWeight:700,color:SL,textTransform:'uppercase',letterSpacing:0.9,textAlign:'center',margin:0}}>{label}</p>
      <p style={{fontSize:17,fontWeight:900,color:'#1e293b',margin:0,textAlign:'center',lineHeight:1.1}}>{value}</p>
      <p style={{fontSize:8.5,color:'#94a3b8',margin:0,textAlign:'center'}}>{sub}</p>
    </div>
  )
}

function MiniKpi({label,value,accent}:{label:string;value:string;accent:string}) {
  return (
    <div style={{background:'white',borderRadius:8,border:'1px solid #e2e8f0',borderLeft:`3px solid ${accent}`,padding:'9px 12px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
      <p style={{fontSize:8,fontWeight:700,color:SL,textTransform:'uppercase',letterSpacing:0.8,margin:'0 0 3px'}}>{label}</p>
      <p style={{fontSize:13,fontWeight:800,color:accent,margin:0}}>{value}</p>
    </div>
  )
}

function PRow({label,value,odd}:{label:string;value:string;odd?:boolean}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3.5px 8px',background:odd?'#f8fafc':'white',borderRadius:3,gap:8}}>
      <span style={{fontSize:9.5,color:'#475569'}}>{label}</span>
      <span style={{fontSize:9.5,fontWeight:700,color:'#1e293b',whiteSpace:'nowrap'}}>{value}</span>
    </div>
  )
}

function PremCard({title,color,rows,icon}:{title:string;color:string;rows:[string,string][];icon:React.ReactNode}) {
  const bg = color === V ? VL : color === OR ? ORL : '#f8fafc'
  const tc = color === V ? V  : color === OR ? OR  : SL
  return (
    <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)',display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:bg,padding:'8px 12px',display:'flex',alignItems:'center',gap:7,borderBottom:`1px solid ${tc}22`}}>
        <div style={{color:tc}}>{icon}</div>
        <p style={{fontSize:10,fontWeight:800,color:tc,margin:0,textTransform:'uppercase',letterSpacing:0.9}}>{title}</p>
      </div>
      <div style={{padding:'6px 6px',display:'flex',flexDirection:'column',gap:1,flex:1}}>
        {rows.map(([l,v],i) => <PRow key={l} label={l} value={v} odd={i%2===1}/>)}
      </div>
    </div>
  )
}

function InvCard({label,value,highlight,icon}:{label:string;value:string;highlight?:boolean;icon?:React.ReactNode}) {
  return (
    <div style={{background:highlight?V:'white',borderRadius:8,border:highlight?'none':'1px solid #e2e8f0',padding:'10px 13px',boxShadow:highlight?`0 3px 12px ${V}44`:'0 1px 3px rgba(0,0,0,.05)',display:'flex',alignItems:'center',gap:9}}>
      {icon && <div style={{flexShrink:0,color:highlight?'white':V}}>{icon}</div>}
      <div>
        <p style={{fontSize:8.5,fontWeight:600,color:highlight?'rgba(255,255,255,.75)':SL,margin:0,textTransform:'uppercase',letterSpacing:0.7}}>{label}</p>
        <p style={{fontSize:highlight?16:14,fontWeight:900,color:highlight?'white':OR,margin:'2px 0 0'}}>{value}</p>
      </div>
    </div>
  )
}

function Banner({text}:{text:string}) {
  return (
    <div style={{background:`linear-gradient(135deg,${V} 0%,${V2} 100%)`,borderRadius:10,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'center',gap:14,boxShadow:`0 3px 16px ${V}44`}}>
      <IcoTrophy/>
      <span style={{fontSize:16,fontWeight:900,color:'white',letterSpacing:1.2,textTransform:'uppercase'}}>{text}</span>
    </div>
  )
}

function SecTitle({title,num}:{title:string;num:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
      <div style={{width:4,height:20,background:V,borderRadius:2}}/>
      <span style={{fontSize:11,fontWeight:700,color:V}}>{num}.</span>
      <span style={{fontSize:13,fontWeight:800,color:'#1e293b',textTransform:'uppercase',letterSpacing:1}}>{title}</span>
    </div>
  )
}

function ChartTip({active,payload,label}:{active?:boolean;payload?:{name:string;value:number;color:string}[];label?:string|number}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,padding:'7px 11px',fontSize:10,boxShadow:'0 4px 12px rgba(0,0,0,.1)'}}>
      <p style={{fontWeight:700,margin:'0 0 3px',color:'#1e293b'}}>Ano {label}</p>
      {payload.map(p => (
        <div key={p.name} style={{display:'flex',justifyContent:'space-between',gap:14}}>
          <span style={{color:p.color}}>{p.name}</span>
          <span style={{fontWeight:700}}>{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props { study: Study; res: ResultadosFinanceiros }

export default function RelatorioExecutivoTab({ study, res }: Props) {
  const at  = study.ativo
  const tar = study.tarifas
  const trib= study.tributos
  const cap = study.capex
  const op  = study.opex
  const pf  = study.premissasFinanceiras

  const anoRows      = useMemo(() => res.tabela.filter(r => r.ano > 0), [res])
  const ano1         = anoRows[0]
  const anoLast      = anoRows[anoRows.length - 1]
  const geracaoAno   = at.geracaoMediaMensal * 12
  const recBruta1    = ano1?.receitaBruta  ?? res.receitaAnual
  const recLiq1      = ano1?.ebitda        ?? res.ebitdaAnual
  const recBrutaLast = anoLast?.receitaBruta ?? 0
  const recLiqLast   = anoLast?.ebitda       ?? 0
  const ebitdaAcum   = useMemo(() => anoRows.reduce((s, r) => s + r.ebitda, 0), [anoRows])
  const recBrutaAcum = useMemo(() => anoRows.reduce((s, r) => s + r.receitaBruta, 0), [anoRows])
  const opex1        = ano1?.opexTotal ?? 0
  const viavel       = res.vpl > 0
  const tirStr       = res.tir != null ? fmtNum(res.tir, 2) : '—'
  const pbStr        = res.paybackSimples != null ? fmtNum(res.paybackSimples, 1) : 'N/A'
  const viavel_str   = viavel ? 'Ativo Viável para Investimento' : 'Ativo Requer Avaliação Adicional'
  const isSolar      = at.fonte === 'ufv' || at.fonte === 'solar'
  const potUnit      = isSolar ? 'kWp' : 'kW'

  const chartData = useMemo(() => anoRows.map(r => ({
    ano: r.ano, recLiq: r.ebitda, recBruta: r.receitaBruta, opexT: r.opexTotal, fluxo: r.fluxoAcumulado,
  })), [anoRows])

  const fluxoData = useMemo(() => [
    { ano: 0, fluxo: res.tabela[0]?.fluxoAcumulado ?? -res.capex },
    ...chartData,
  ], [chartData, res])

  const parecer = `O ativo apresenta TIR de ${tirStr}% a.a.${res.tir != null ? `, ${res.tir > pf.tma ? 'superior' : 'inferior'} à TMA de ${fmtNum(pf.tma, 2)}% a.a.,` : ','} com Payback de ${pbStr} anos e VPL ${res.vpl > 0 ? 'positivo' : 'negativo'}. A receita bruta estimada para o primeiro ano é de ${fmtBRL(recBruta1, 0)}, com geração anual projetada de ${fmtNum(geracaoAno, 1)} MWh. No último ano do ciclo (ano ${anoLast?.ano ?? pf.vidaUtil}), a receita bruta projetada é de ${fmtBRL(recBrutaLast, 0)} e a líquida de ${fmtBRL(recLiqLast, 0)}.`

  const IcoTec  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="10" width="20" height="10" rx="1"/><line x1="7" y1="10" x2="7" y2="20"/><line x1="12" y1="10" x2="12" y2="20"/><line x1="17" y1="10" x2="17" y2="20"/><path d="M2 15h20"/></svg>
  const IcoFin  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  const IcoOp   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
  const IcoEst  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/></svg>
  const IcoDest = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

  const tec: [string,string][] = [
    ['Fonte de Energia',              FONTE_LABELS[at.fonte] ?? at.fonte],
    [`Potência Instalada (${potUnit})`, fmtNum(at.potencia, 0)],
    ['Fator de Capacidade (%)',       fmtNum(at.fatorCapacidade, 2) + '%'],
    ['Tipo de GD',                    at.tipoGD],
    ['Concessionária',           at.concessionaria || '—'],
    ['Consumo Anual (MWh)',           fmtNum(at.consumoAnualUG / 1000, 1)],
    ['Geração Mensal (MWh)', fmtNum(at.geracaoMediaMensal, 1)],
    ['Geração Anual (MWh)',  fmtNum(geracaoAno, 1)],
  ]
  const fin: [string,string][] = [
    ['TUSD G (R$/kW)',                fmtNum(tar.tusdG, 4)],
    ['Tarifa de Venda (R$/MWh)',      fmtNum(tar.tarifaVenda, 2)],
    ['Reajuste Anual (%)',            fmtNum(tar.reajusteAnual, 2) + '%'],
    ['PIS (%)',                       fmtNum(trib.pis, 2) + '%'],
    ['COFINS (%)',                    fmtNum(trib.cofins, 2) + '%'],
    ['ICMS (%)',                      fmtNum(trib.icms, 2) + '%'],
    ['Tributos s/ Receita (%)',       fmtNum(trib.tributosReceita, 2) + '%'],
    ['TMA (% a.a.)',                  fmtNum(pf.tma, 2) + '%'],
    ['SELIC (% a.a.)',                fmtNum(pf.selic, 2) + '%'],
    ['IPCA (% a.a.)',                 fmtNum(pf.inflacao, 2) + '%'],
    ['Vida Útil (anos)',         String(pf.vidaUtil)],
  ]
  const opexRows: [string,string][] = [
    ['Operação',          fmtNum(op.operacao, 2) + '%'],
    ['Manutenção',        fmtNum(op.manutencao, 2) + '%'],
    ['Seguro',                       fmtNum(op.seguro, 2) + '%'],
    ['Gestão (% Receita)',      fmtNum(op.gestao, 2) + '%'],
    ['Arrendamento/mês',        fmtBRL(op.arrendamento, 0)],
    ['Gestão Fixo/mês',   fmtBRL(op.fixoGestao, 0)],
  ]

  const CHART_H = 230

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',Arial,sans-serif",color:'#1e293b',display:'flex',flexDirection:'column',gap:24}}>

      {/* CABEÇALHO */}
      <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.06)',display:'flex',alignItems:'center',padding:'18px 24px',gap:18}}>
        <div style={{flexShrink:0}}>
          <img src="/solfus-logo.png.png" alt="SOLFUS" style={{height:72,objectFit:'contain',display:'block'}}/>
        </div>
        <div style={{flex:1,textAlign:'center'}}>
          <p style={{fontSize:22,fontWeight:900,color:'#1e293b',margin:0,letterSpacing:2,textTransform:'uppercase'}}>Relatório Executivo</p>
          <p style={{fontSize:8.5,color:'#94a3b8',margin:'4px 0 8px',letterSpacing:1,textTransform:'uppercase'}}>Análise de viabilidade para aquisição de ativo de geração</p>
          <div style={{width:52,height:3,background:V,borderRadius:2,margin:'0 auto'}}/>
        </div>
        <div style={{flexShrink:0,border:`1.5px solid ${V}`,borderRadius:10,overflow:'hidden',minWidth:185}}>
          <div style={{background:VL,padding:'6px 12px',borderBottom:`1px solid ${V}22`}}>
            <p style={{fontSize:10,fontWeight:800,color:V,margin:0,textTransform:'uppercase',letterSpacing:1}}>Ativo em Análise</p>
          </div>
          <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14}}>{'☀️'}</span>
              <span style={{fontSize:11,color:'#1e293b',fontWeight:700}}>{at.nomeUsina || at.nomeEstudo || 'Sem nome'}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14}}>{'🏢'}</span>
              <span style={{fontSize:11,color:'#475569'}}>{at.concessionaria || '—'}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14}}>{'📅'}</span>
              <span style={{fontSize:11,color:'#475569'}}>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2 — RESUMO EXECUTIVO */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <SecTitle title="Resumo Executivo" num="2"/>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <KpiCard label="VPL (R$)"           color={V}  icon={<IcoBar/>}    value={fmtBRL(res.vpl,0).replace('R$','').trim()} sub="Valor Presente Líquido"/>
          <KpiCard label="TIR (% a.a.)"       color={OR} icon={<IcoPct/>}    value={res.tir != null ? `${tirStr}%` : '—'}  sub={`TMA: ${fmtNum(pf.tma,2)}%`}/>
          <KpiCard label="Payback"            color={OR} icon={<IcoClock/>}  value={pbStr + (res.paybackSimples != null ? ' anos' : '')} sub="Retorno do capital"/>
          <KpiCard label="EBITDA Acumulado"   color={V}  icon={<IcoDollar/>} value={fmtBRL(ebitdaAcum,0).replace('R$','').trim()} sub={`Ciclo ${pf.vidaUtil} anos`}/>
          <KpiCard label="CAPEX Total (R$)"   color={OR} icon={<IcoCoins/>}  value={fmtBRL(res.capex,0).replace('R$','').trim()} sub="Investimento total"/>
          <KpiCard label="Geração Anual (MWh)" color={V} icon={<IcoLight/>} value={fmtNum(geracaoAno,1)} sub={`${fmtNum(at.geracaoMediaMensal,1)} MWh/mês`}/>
        </div>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',border:'1px solid #e2e8f0',display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{flexShrink:0,marginTop:2,background:VL,borderRadius:'50%',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IcoCheck/>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:800,color:V,textTransform:'uppercase',letterSpacing:1,margin:'0 0 5px'}}>Parecer Executivo</p>
            <p style={{fontSize:11.5,color:'#475569',margin:0,lineHeight:1.7}}>{parecer}</p>
          </div>
        </div>
        <Banner text={viavel_str}/>
      </div>

      {/* SEÇÃO 3 — PREMISSAS E INVESTIMENTOS */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <SecTitle title="Premissas e Investimentos" num="3"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,alignItems:'stretch'}}>
          <PremCard title="Dados Técnicos"    color={V}  rows={tec}      icon={<IcoTec/>}/>
          <PremCard title="Dados Financeiros"       color={OR} rows={fin}      icon={<IcoFin/>}/>
          <PremCard title="OPEX (% CAPEX)"          color={SL} rows={opexRows} icon={<IcoOp/>}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:14,alignItems:'stretch'}}>

          {/* Estrutura de Investimento */}
          <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
            <div style={{background:VL,padding:'8px 12px',display:'flex',alignItems:'center',gap:7,borderBottom:`1px solid ${V}22`}}>
              <div style={{color:V}}><IcoEst/></div>
              <p style={{fontSize:10,fontWeight:800,color:V,margin:0,textTransform:'uppercase',letterSpacing:0.9}}>Estrutura de Investimento</p>
            </div>
            <div style={{padding:'12px 10px',display:'flex',flexDirection:'column',gap:8}}>
              <InvCard label="Custo da Usina"       value={fmtBRL(cap.usina,0)}    icon={<IcoCoins/>}/>
              <InvCard label="Obra de Rede"          value={fmtBRL(cap.obraRede,0)} icon={<IcoEst/>}/>
              <InvCard label="Total do Investimento" value={fmtBRL(res.capex,0)}    highlight/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
                <div style={{background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0',padding:'9px 12px'}}>
                  <p style={{fontSize:8.5,color:SL,margin:'0 0 2px',fontWeight:600,textTransform:'uppercase'}}>OPEX Total Ano 1</p>
                  <p style={{fontSize:13,fontWeight:800,color:'#1e293b',margin:0}}>{fmtBRL(opex1,0)}</p>
                </div>
                <div style={{background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0',padding:'9px 12px'}}>
                  <p style={{fontSize:8.5,color:SL,margin:'0 0 2px',fontWeight:600,textTransform:'uppercase'}}>Meses 1º Ano</p>
                  <p style={{fontSize:13,fontWeight:800,color:'#1e293b',margin:0}}>{pf.mesesPrimeiroAno} meses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Destaques — 9 KPIs: grid 3 colunas */}
          <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
            <div style={{background:ORL,padding:'8px 12px',display:'flex',alignItems:'center',gap:7,borderBottom:`1px solid ${OR}22`}}>
              <div style={{color:OR}}><IcoDest/></div>
              <p style={{fontSize:10,fontWeight:800,color:OR,margin:0,textTransform:'uppercase',letterSpacing:0.9}}>Destaques do Projeto</p>
            </div>
            <div style={{padding:'12px 10px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              <MiniKpi label="Rec. Bruta Ano 1"            value={fmtBRL(recBruta1,0)}    accent={V}/>
              <MiniKpi label="Rec. Líquida Ano 1"     value={fmtBRL(recLiq1,0)}      accent={OR}/>
              <MiniKpi label="TIR (% a.a.)"                value={res.tir != null ? `${tirStr}%` : '—'} accent={OR}/>
              <MiniKpi label="VPL (R$)"                    value={fmtBRL(res.vpl,0)}      accent={V}/>
              <MiniKpi label="Payback Simples"             value={pbStr+(res.paybackSimples != null?' anos':'')} accent={OR}/>
              <MiniKpi label={`Rec. Bruta Ano ${anoLast?.ano ?? pf.vidaUtil}`} value={fmtBRL(recBrutaLast,0)} accent={V}/>
              <MiniKpi label={`Rec. Líq. Ano ${anoLast?.ano ?? pf.vidaUtil}`} value={fmtBRL(recLiqLast,0)} accent={V}/>
              <MiniKpi label="EBITDA Acumulado"            value={fmtBRL(ebitdaAcum,0)}   accent={OR}/>
              <MiniKpi label="Receita Acumulada"           value={fmtBRL(recBrutaAcum,0)} accent={V}/>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 4 — DESEMPENHO FINANCEIRO */}
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <SecTitle title="Desempenho Financeiro" num="4"/>

        {/* Tabela */}
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          <div style={{background:VL,padding:'9px 14px',borderBottom:`1px solid ${V}22`}}>
            <p style={{fontSize:11,fontWeight:800,color:V,margin:0,textTransform:'uppercase',letterSpacing:1,textAlign:'center'}}>Resumo Financeiro (valores em R$)</p>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Ano','Receita Bruta','Tributos','OPEX Total','Receita Líquida'].map(h => (
                    <th key={h} style={{padding:'8px 12px',textAlign:h==='Ano'?'center':'right',fontWeight:700,color:'#475569',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {anoRows.map((r, i) => {
                  const isLast = i === anoRows.length - 1
                  if (i > 5 && !isLast) return null
                  return (
                    <>
                      {i === 5 && anoRows.length > 6 && (
                        <tr key="sep"><td colSpan={5} style={{textAlign:'center',padding:'4px',fontSize:12,color:'#94a3b8'}}>…</td></tr>
                      )}
                      <tr key={r.ano} style={{background:isLast?VL:i%2===0?'white':'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'7px 12px',textAlign:'center',fontWeight:700,color:isLast?V:'#1e293b'}}>{r.ano}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',color:'#1e293b'}}>{fmtM(r.receitaBruta)}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',color:'#dc2626'}}>{fmtM(r.tributos)}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',color:'#64748b'}}>{fmtM(r.opexTotal)}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',fontWeight:700,color:r.ebitda>=0?'#15803d':'#dc2626'}}>{fmtM(r.ebitda)}</td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico 1 — Receita Líquida */}
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          <p style={{fontSize:11,fontWeight:700,color:'#475569',margin:'0 0 14px',textAlign:'center',textTransform:'uppercase',letterSpacing:0.8}}>Receita Líquida por Ano (R$)</p>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <AreaChart data={chartData} margin={{top:6,right:24,left:12,bottom:0}}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3"/>
              <XAxis dataKey="ano" tick={{fontSize:10,fill:'#94a3b8'}} label={{value:'Ano',position:'insideBottom',offset:-2,fontSize:10,fill:'#94a3b8'}}/>
              <YAxis tickFormatter={fmtM} tick={{fontSize:10,fill:'#94a3b8'}} width={68}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="recLiq" name="Rec. Líquida" stroke={V} strokeWidth={2.5} fill={V} fillOpacity={0.12} dot={false} activeDot={{r:5}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2 — Receita Bruta × OPEX */}
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          <p style={{fontSize:11,fontWeight:700,color:'#475569',margin:'0 0 14px',textAlign:'center',textTransform:'uppercase',letterSpacing:0.8}}>Evolução da Receita Bruta e OPEX (R$)</p>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <ComposedChart data={chartData} margin={{top:6,right:24,left:12,bottom:0}}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3"/>
              <XAxis dataKey="ano" tick={{fontSize:10,fill:'#94a3b8'}} label={{value:'Ano',position:'insideBottom',offset:-2,fontSize:10,fill:'#94a3b8'}}/>
              <YAxis tickFormatter={fmtM} tick={{fontSize:10,fill:'#94a3b8'}} width={68}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend iconSize={10} wrapperStyle={{fontSize:10,paddingTop:8}}/>
              <Bar dataKey="recBruta" name="Receita Bruta" fill={OR} fillOpacity={0.75} radius={[3,3,0,0]}/>
              <Line type="monotone" dataKey="opexT" name="OPEX Total" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{r:5}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3 — Fluxo Acumulado */}
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          <p style={{fontSize:11,fontWeight:700,color:'#475569',margin:'0 0 14px',textAlign:'center',textTransform:'uppercase',letterSpacing:0.8}}>Fluxo Acumulado (R$)</p>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <AreaChart data={fluxoData} margin={{top:6,right:24,left:12,bottom:0}}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3"/>
              <XAxis dataKey="ano" tick={{fontSize:10,fill:'#94a3b8'}} label={{value:'Ano',position:'insideBottom',offset:-2,fontSize:10,fill:'#94a3b8'}}/>
              <YAxis tickFormatter={fmtM} tick={{fontSize:10,fill:'#94a3b8'}} width={68}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="fluxo" name="Fluxo Acumulado" stroke={V} strokeWidth={2.5} fill={V} fillOpacity={0.12} dot={false} activeDot={{r:6}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conclusão */}
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',border:'1px solid #e2e8f0',display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{flexShrink:0,background:VL,borderRadius:'50%',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IcoCheck/>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:800,color:V,textTransform:'uppercase',letterSpacing:1,margin:'0 0 5px'}}>Conclusão</p>
            <p style={{fontSize:11.5,color:'#475569',margin:0,lineHeight:1.7}}>
              O projeto apresenta TIR de {res.tir != null ? `${tirStr}%` : '—'}{res.tir != null ? `, ${res.tir > pf.tma ? `superior à TMA de ${fmtNum(pf.tma,2)}%` : `abaixo da TMA de ${fmtNum(pf.tma,2)}%`},` : ','} com Payback estimado em {pbStr}{res.paybackSimples != null ? ' anos' : ''} e VPL de {fmtBRL(res.vpl,0)}, {res.vpl > 0 ? 'demonstrando viabilidade econômica sob as premissas adotadas.' : 'indicando necessidade de revisão das premissas do projeto.'}
            </p>
          </div>
        </div>

        <Banner text={viavel_str}/>
      </div>

      {/* Rodapé */}
      <div style={{textAlign:'center',borderTop:'1px solid #e2e8f0',paddingTop:10}}>
        <p style={{fontSize:10,color:'#94a3b8',margin:0}}>
          <span style={{color:V,fontWeight:700}}>SOLFUS</span>{' '}
          Engenharia e Conservação de Energia — Análise gerada em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
