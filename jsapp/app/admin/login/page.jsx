'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { setErro('E-mail ou senha inválidos.'); return; }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', padding: 20 }}>
      <form onSubmit={entrar} style={{ width: '100%', maxWidth: 380, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 18, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="serif" style={{ fontSize: 20, color: 'var(--cream-2)', letterSpacing: '.04em' }}>JASON DIAS</div>
          <div style={{ fontSize: 13, color: 'var(--taupe)', marginTop: 6 }}>Área do corretor — acesso restrito</div>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sand)' }}>E-mail</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="seu@email.com" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sand)' }}>Senha</span>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required style={inp} placeholder="••••••••" />
        </label>
        {erro && <div style={{ fontSize: 13, color: '#e88a7a' }}>{erro}</div>}
        <button type="submit" disabled={loading} style={{ height: 52, borderRadius: 12, background: 'var(--accent)', color: '#2A2117', fontSize: 15, fontWeight: 700, border: 0 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const inp = { width: '100%', background: 'var(--bg-2)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '14px 16px', fontSize: 16, color: 'var(--cream)' };
