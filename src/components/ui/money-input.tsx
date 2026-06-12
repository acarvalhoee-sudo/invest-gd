/**
 * MoneyInput — campo numérico com máscara brasileira em tempo real.
 *
 * Formato monetário : 1.000.000,00   (prefixo "R$ " opcional)
 * Formato percentual: 12,65          (sufixo "%" opcional via prop suffix)
 *
 * Salva como number puro no Firestore — a máscara é só visual.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Remove tudo que não é dígito */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Converte string de dígitos (centavos) → número JS.
 * Ex: "100000" → 1000.00
 */
function digitsToNumber(digits: string): number {
  if (!digits) return 0
  const n = parseInt(digits, 10)
  return n / 100
}

/**
 * Formata número → string mascarada brasileira.
 * Ex: 1234567.89 → "1.234.567,89"
 */
function formatBRL(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Converte string mascarada → número JS.
 * Aceita tanto "1.234,56" quanto "1234.56" (fallback).
 */
export function parseBRL(s: string): number {
  if (!s) return 0
  // Remove prefixo/sufixo não numérico e espaços
  const clean = s.replace(/[^\d,.-]/g, '').trim()
  if (!clean) return 0
  // Formato pt-BR: ponto = milhar, vírgula = decimal
  const normalized = clean.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** Valor numérico controlado */
  value: number
  /** Callback com o número puro (sem máscara) */
  onChange: (value: number) => void
  /** "money" (padrão) → 2 decimais. "percent" → 2 decimais sem milhar. */
  mode?: 'money' | 'percent'
  /** Prefixo visual (ex: "R$"). Padrão: "R$ " para money, vazio para percent. */
  prefix?: string
  /** Sufixo visual (ex: "%"). Padrão: "%" para percent, vazio para money. */
  suffix?: string
  /** Mensagem de erro (borda vermelha) */
  error?: string
  /** Classe extra no wrapper */
  wrapperClassName?: string
}

/* ------------------------------------------------------------------ */
/* Componente                                                           */
/* ------------------------------------------------------------------ */

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    {
      value,
      onChange,
      mode = 'money',
      prefix: prefixProp,
      suffix: suffixProp,
      error,
      className,
      wrapperClassName,
      onFocus,
      onBlur,
      disabled,
      readOnly,
      ...rest
    },
    ref,
  ) {
    /* Defaults de prefixo/sufixo por modo */
    const prefix = prefixProp !== undefined ? prefixProp : mode === 'money' ? 'R$ ' : ''
    const suffix = suffixProp !== undefined ? suffixProp : mode === 'percent' ? '%' : ''

    /* Estado interno de texto (controlado externamente pelo number) */
    const [display, setDisplay] = React.useState<string>(() =>
      value === 0 ? '' : formatBRL(value),
    )
    const [focused, setFocused] = React.useState(false)

    /* Sincroniza quando value muda externamente (ex: reset do form) */
    React.useEffect(() => {
      if (!focused) {
        setDisplay(value === 0 ? '' : formatBRL(value))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, focused])

    /* ---- handlers ---- */

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (readOnly || disabled) return

      const raw  = e.target.value
      const digits = digitsOnly(raw)

      if (!digits) {
        setDisplay('')
        onChange(0)
        return
      }

      const num = digitsToNumber(digits)
      const formatted = formatBRL(num)
      setDisplay(formatted)
      onChange(num)
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true)
      onFocus?.(e)
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false)
      // Garante formatação correta ao sair do campo
      setDisplay(value === 0 ? '' : formatBRL(value))
      onBlur?.(e)
    }

    /* ---- padding dinâmico para prefixo/sufixo ---- */
    const prefixPx = prefix ? prefix.length * 7.5 + 12 : 12
    const suffixPx = suffix ? suffix.length * 7.5 + 12 : 12

    return (
      <div className={cn('relative flex items-center', wrapperClassName)}>
        {prefix && (
          <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none select-none z-10">
            {prefix}
          </span>
        )}

        <input
          {...rest}
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          readOnly={readOnly}
          value={display}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ paddingLeft: prefixPx, paddingRight: suffixPx }}
          className={cn(
            // Base — mesmos estilos do <Input> existente
            'flex h-9 w-full rounded-md border bg-transparent text-sm shadow-xs',
            'transition-[color,box-shadow] duration-200 outline-none',
            'placeholder:text-muted-foreground tabular-nums',
            // Estado normal
            'border-input',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            // Erro
            error && 'border-destructive focus-visible:ring-destructive/50',
            // Disabled / readOnly
            (disabled || readOnly) && 'cursor-not-allowed opacity-60 bg-muted/40',
            className,
          )}
        />

        {suffix && (
          <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none select-none z-10">
            {suffix}
          </span>
        )}
      </div>
    )
  },
)

MoneyInput.displayName = 'MoneyInput'
