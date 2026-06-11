/** Formata valor em R$ */
export function fmtBRL(value: number, casas = 0): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  })
}

/** Formata percentual */
export function fmtPct(value: number, casas = 1): string {
  return `${value.toFixed(casas)}%`
}

/** Formata número com separador */
export function fmtNum(value: number, casas = 2): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Formata data */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/** Formata kW / kWp */
export function fmtPotencia(kw: number, solar = false): string {
  return `${fmtNum(kw, 0)} ${solar ? 'kWp' : 'kW'}`
}

/** Abrevia valores grandes */
export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}K`
  return fmtBRL(n)
}
