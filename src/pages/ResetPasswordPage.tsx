/**
 * ResetPasswordPage.tsx
 * Recuperação de senha por e-mail via Firebase
 */

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setEnviado(true)
      toast.success('E-mail de recuperação enviado!')
    } catch {
      toast.error('Erro ao enviar e-mail. Verifique o endereço informado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">INVEST GD</h1>
            <p className="text-primary-300 text-sm">Viabilidade de Geração Distribuída</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {enviado ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">E-mail enviado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Verifique sua caixa de entrada em <strong>{email}</strong> e siga as instruções para redefinir sua senha.
              </p>
              <Link to="/login" className="btn-primary w-full justify-center">
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Recuperar senha</h2>
              <p className="text-gray-500 text-sm mb-6">
                Informe seu e-mail cadastrado e enviaremos um link para redefinição.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" className="input" placeholder="seu@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full btn-lg" disabled={loading}>
                  {loading ? 'Enviando…' : (
                    <span className="flex items-center gap-2 justify-center">
                      <Mail className="w-4 h-4" /> Enviar e-mail
                    </span>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
