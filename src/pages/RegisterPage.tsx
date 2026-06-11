/**
 * RegisterPage.tsx
 * Tela de cadastro de novo usuário
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate      = useNavigate()

  const [nome,    setNome]    = useState('')
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [confirma, setConfirma] = useState('')
  const [ver,     setVer]     = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha !== confirma) { toast.error('As senhas não coincidem.'); return }
    if (senha.length < 6)   { toast.error('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    try {
      await register(nome, email, senha)
      toast.success('Conta criada com sucesso!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso.')
      } else {
        toast.error('Erro ao criar conta. Tente novamente.')
      }
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
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Criar conta</h2>
          <p className="text-gray-500 text-sm mb-6">Preencha os dados para se cadastrar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" placeholder="Seu nome" value={nome}
                onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input type={ver ? 'text' : 'password'} className="input pr-10"
                  placeholder="Mínimo 6 caracteres" value={senha}
                  onChange={(e) => setSenha(e.target.value)} required />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setVer(!ver)}>
                  {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input type={ver ? 'text' : 'password'} className="input"
                placeholder="Repita a senha" value={confirma}
                onChange={(e) => setConfirma(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Criando conta…' : (
                <span className="flex items-center gap-2 justify-center">
                  <UserPlus className="w-4 h-4" /> Criar conta
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
