'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase-browser';
import { formatPreco, ytId, ytThumb } from '../../lib/format';

export default function GestaoClient({ initialImoveis, initialParceiros }) {
  const router = useRouter();
  const supabase = createClient();
  const [imoveis, setImoveis] = useState(initialImoveis);
  const [parceiros, setParceiros] = useState(initialParceiros);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('todos');
  const [confirm, setConfirm] = useState(null);
  const [showParceiros, setShowParceiros] = useState(false);
  const [pNome, setPNome] = useState(''); const [pPct, setPPct] = useState('');
  const [hero, setHero] = useState('');
  const [heroSalvo, setHeroSalvo] = useState(false);

  async function togglePausa(im) {
    const novo = im.status === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('imoveis').update({ status: novo }).eq('id', im.id);
    setImoveis(l => l.map(x => x.id === im.id ? { ...x, status: novo } : x));
  }
  async function excluir(im) {
    if (confirm !== im.id) { setConfirm(im.id); return; }
    await supabase.from('imoveis').delete().eq('id', im.id);
    setImoveis(l => l.filter(x => x.id !== im.id));
    setConfirm(null);
  }
  async function addParceiro() {
    if (!pNome.trim()) return;
    const { data } = await supabase.from('parceiros').insert({ nome: pNome.trim(), comissao_pct: Number(pPct) || 0 }).select().single();
    if (data) setParceiros(l => [...l, data]);
    setPNome(''); setPPct('');
  }
  async function removeParceiro(id) {
    await supabase.from('parceiros').delete().eq('id', id);
    setParceiros(l => l.filter(p => p.id !== id));
  }
  async function salvarHero() {
    // marca o imóvel com este vídeo como destaque (fonte do hero)
    const vid = ytId(hero);
    if (!vid) return;
    await supabase.from('imoveis').update({ destaque: false }).eq('destaque', true);
    await supabase.from('imoveis').update({ destaque: true }).eq('video_id', vid);
    setHeroSalvo(true);
  }
  async function sair() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const q = busca.trim().toLowerCase();
  const lista = imoveis
    .filter(i => aba === 'todos' || (aba === 'ativos' ? i.status === 'ativo' : i.status === 'pausado'))
    .filter(i => !q || i.titulo.toLowerCase().includes(q) || (i.bairro || '').toLowerCase().includes(q));
  const ativos = imoveis.filter(i => i.status === 'ativo').length;
  const pausados = imoveis.filter(i => i.status === 'pausado').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 760, minHeight: '100vh', background: 'var(--bg)' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(31,24,18,.95)', backdropFilter: 'blur(8px)', padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" title="Voltar ao site" style={{ display: 'flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)' }}>⌂</Link>
            <div>
              <div className="serif" style={{ fontSize: 18, color: 'var(--cream-2)' }}>Meus imóveis</div>
              <div style={{ fontSize: 12, color: 'var(--taupe)' }}>{ativos} no ar · {pausados} pausados</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowParceiros(v => !v)} style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(232,168,124,.4)', background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>Parceiros</button>
            <Link href="/admin/novo" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#2A2117', padding: '11px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 700 }}>+ Novo imóvel</Link>
            <button onClick={sair} title="Sair" style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(243,237,227,.15)', background: 'transparent', color: 'var(--muted)', fontSize: 13 }}>Sair</button>
          </div>
        </header>

        <div style={{ padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* VÍDEO DA HOME */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ fontSize: 14, color: 'var(--cream-2)' }}>▶ Vídeo em destaque da home</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={hero} onChange={e => { setHero(e.target.value); setHeroSalvo(false); }} placeholder="Cole o link do YouTube ou Shorts do imóvel em destaque…" style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--cream)' }} />
              <button onClick={salvarHero} style={{ padding: '13px 20px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13.5, fontWeight: 700, border: 0 }}>{heroSalvo ? 'Salvo ✓' : 'Salvar'}</button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>O imóvel com este vídeo vira o destaque que aparece rodando no topo do site.</span>
          </div>

          {showParceiros && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 14, color: 'var(--cream-2)' }}>Parceiros</strong>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--taupe)', background: 'rgba(243,237,227,.08)', padding: '4px 9px', borderRadius: 5 }}>CONTROLE INTERNO</span>
              </div>
              {parceiros.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.nome}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{p.comissao_pct}%</span>
                    <button onClick={() => removeParceiro(p.id)} style={{ background: 'transparent', border: 0, color: 'var(--muted)', fontSize: 15 }}>×</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={pNome} onChange={e => setPNome(e.target.value)} placeholder="Nome do parceiro" style={{ flex: 2, minWidth: 150, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'var(--cream)' }} />
                <input value={pPct} onChange={e => setPPct(e.target.value.replace(/\D/g, ''))} placeholder="%" style={{ width: 70, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'var(--cream)' }} />
                <button onClick={addParceiro} style={{ padding: '12px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13.5, fontWeight: 700, border: 0 }}>Adicionar</button>
              </div>
            </div>
          )}

          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título ou bairro…" style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 16, color: 'var(--cream)' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            {[['todos', `Todos (${imoveis.length})`], ['ativos', `Ativos (${ativos})`], ['pausados', `Pausados (${pausados})`]].map(([k, label]) => (
              <button key={k} onClick={() => setAba(k)} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: aba === k ? 700 : 400, background: aba === k ? 'var(--cream)' : 'transparent', color: aba === k ? '#2A2117' : 'var(--cream)', border: `1px solid ${aba === k ? 'var(--cream)' : 'rgba(243,237,227,.25)'}` }}>{label}</button>
            ))}
          </div>

          {lista.map(im => {
            const vid = ytId(im.youtube_url);
            const pausado = im.status === 'pausado';
            return (
              <div key={im.id} style={{ display: 'flex', gap: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, opacity: pausado ? 0.55 : 1 }}>
                <div style={{ width: 74, flex: 'none', aspectRatio: '9/14', borderRadius: 10, background: (im.capa_url || vid) ? `url("${im.capa_url || ytThumb(vid)}") center/cover` : 'linear-gradient(150deg,#6B5A44,#463928)' }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream-2)' }}>{im.titulo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: pausado ? 'rgba(243,237,227,.1)' : 'rgba(168,192,143,.15)', color: pausado ? 'var(--taupe)' : 'var(--green)' }}>{pausado ? 'PAUSADO' : 'NO AR'}</span>
                      {im.parceiros?.nome && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(232,168,124,.12)', border: '1px solid rgba(232,168,124,.3)', color: 'var(--accent)' }}>{im.parceiros.nome}{im.parceiro_pct ? ` · ${im.parceiro_pct}%` : ''}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--taupe)', marginTop: 3 }}>{im.bairro} · {formatPreco(im.preco_cents)}{im.finalidade === 'aluguel' ? '/mês' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href={`/admin/novo?id=${im.id}`} style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(232,168,124,.12)', border: '1px solid rgba(232,168,124,.35)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }}>Editar</Link>
                    <button onClick={() => togglePausa(im)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(243,237,227,.18)', background: 'transparent', color: 'var(--sand)', fontSize: 12.5, fontWeight: 600 }}>{pausado ? 'Reativar' : 'Pausar'}</button>
                    <button onClick={() => excluir(im)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(200,90,70,.3)', background: 'transparent', color: '#c88a7a', fontSize: 12.5, fontWeight: 600 }}>{confirm === im.id ? 'Confirmar exclusão?' : 'Excluir'}</button>
                  </div>
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Nenhum imóvel encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
