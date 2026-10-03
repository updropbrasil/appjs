'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase-browser';

const CAMPOS = [
  { key: 'meta_pixel_id', label: 'ID do Pixel da Meta', exemplo: '123456789012345', ajuda: 'Gerenciador de Eventos da Meta → Fontes de dados → seu Pixel. Só os números.', valido: v => /^\d{6,20}$/.test(v) },
  { key: 'ga_id', label: 'ID do Google Analytics (GA4)', exemplo: 'G-ABC123XYZ', ajuda: 'Analytics → Administrador → Fluxos de dados → Web. Começa com G-.', valido: v => /^G-[A-Z0-9]{4,20}$/.test(v) },
  { key: 'clarity_id', label: 'ID do Microsoft Clarity', exemplo: 'abcd1234ef', ajuda: 'clarity.microsoft.com → seu projeto → Configurações → Visão geral → ID do projeto.', valido: v => /^[a-z0-9]{6,20}$/.test(v) },
];

export default function RastreamentoClient({ inicial }) {
  const supabase = createClient();
  const [vals, setVals] = useState(() => Object.fromEntries(CAMPOS.map(c => [c.key, inicial[c.key] || ''])));
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    for (const c of CAMPOS) {
      const v = (vals[c.key] || '').trim();
      if (v && !c.valido(v)) { setMsg(`O ${c.label} não está no formato certo (ex.: ${c.exemplo}).`); return; }
    }
    setSalvando(true);
    const linhas = CAMPOS.map(c => ({ key: c.key, value: (vals[c.key] || '').trim() }));
    const { error } = await supabase.from('site_config').upsert(linhas);
    setSalvando(false);
    setMsg(error ? 'Não salvou: ' + error.message : 'Salvo ✓ — o site passa a usar em até 5 minutos, sem redeploy.');
  }

  const caixa = { background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '13px 14px', color: 'var(--cream)', fontSize: 15, width: '100%' };
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--cream)' }}>
      <header style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin" style={{ display: 'flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)' }}>‹</Link>
        <strong style={{ fontSize: 17 }}>Rastreamento</strong>
      </header>
      <div style={{ maxWidth: 560, padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Cole aqui os IDs das ferramentas de medição. O Pixel registra qual imóvel cada pessoa viu e quem clicou no WhatsApp, o que permite anunciar o catálogo para quem já se interessou. Deixe em branco para desligar.
        </p>
        {CAMPOS.map(c => (
          <label key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream-2)' }}>{c.label}</span>
            <input value={vals[c.key]} onChange={e => { setVals(v => ({ ...v, [c.key]: e.target.value })); setMsg(''); }} placeholder={c.exemplo} style={caixa} spellCheck={false} autoCapitalize="off" />
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.ajuda}</span>
          </label>
        ))}
        <button onClick={salvar} disabled={salvando} style={{ padding: '14px 20px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 14, fontWeight: 700, border: 0, opacity: salvando ? 0.6 : 1 }}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg.startsWith('Salvo') ? 'var(--green)' : '#c88a7a' }}>{msg}</div>}
      </div>
    </main>
  );
}
