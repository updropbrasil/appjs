'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase-browser';
import { uploadToR2, deleteFromR2 } from '../../lib/r2-upload';
import { compressBlob, fetchBlob } from '../../lib/image';
import { formatPreco, ytId, ytThumb } from '../../lib/format';
import { motivoInapto } from '../../lib/zap-feed';
import { SITE_URL } from '../../lib/config';

export default function GestaoClient({ initialImoveis, initialParceiros, initialHero, initialHeroFile, initialZapEmail }) {
  const router = useRouter();
  const supabase = createClient();
  const [imoveis, setImoveis] = useState(initialImoveis);
  const [parceiros, setParceiros] = useState(initialParceiros);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('todos');
  const [confirm, setConfirm] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [otim, setOtim] = useState(null); // {total, feitas, erros} | null
  const [showPortais, setShowPortais] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [abaPortal, setAbaPortal] = useState('no-portal');
  const [zapEmail, setZapEmail] = useState(initialZapEmail || '');
  const [zapSalvo, setZapSalvo] = useState(true);
  async function salvarZapEmail() {
    await supabase.from('site_config').upsert({ key: 'zap_email', value: (zapEmail || '').trim() });
    setZapSalvo(true);
  }
  const feedUrl = `${SITE_URL}/feed/zap.xml`;
  const listaPortal = { no: [], fora: [], pendente: [] };
  imoveis.filter(i => i.status === 'ativo').forEach(im => {
    if (im.zap_ativo === false) { listaPortal.fora.push({ im, motivo: null }); return; }
    const motivo = motivoInapto(im);
    if (motivo) listaPortal.pendente.push({ im, motivo });
    else listaPortal.no.push({ im, motivo: null });
  });
  const noPortal = listaPortal.no.length;

  // Reprocessa as fotos já publicadas: gera a versão leve e recomprime a grande.
  async function otimizarFotos() {
    const { data: fotos } = await supabase
      .from('imovel_fotos')
      .select('id, url, thumb_url')
      .is('thumb_url', null);
    const lista = (fotos || []).filter(f => f.url);
    if (!lista.length) { setOtim({ total: 0, feitas: 0, erros: 0, fim: true }); return; }
    setOtim({ total: lista.length, feitas: 0, erros: 0 });
    let feitas = 0, erros = 0;
    for (const f of lista) {
      try {
        const orig = await fetchBlob(f.url);
        const grande = await compressBlob(orig, 1600, 0.8);
        const leve = await compressBlob(orig, 520, 0.62);
        if (!leve) throw new Error('falha ao processar');
        const thumbUrl = await uploadToR2(new File([leve], 'thumb.jpg', { type: 'image/jpeg' }), null, 'fotos');
        let novaUrl = null;
        // só troca a grande se realmente ficou mais leve
        if (grande && grande.size < orig.size * 0.9) {
          novaUrl = await uploadToR2(new File([grande], 'foto.jpg', { type: 'image/jpeg' }), null, 'fotos');
        }
        await supabase.from('imovel_fotos')
          .update(novaUrl ? { thumb_url: thumbUrl, url: novaUrl } : { thumb_url: thumbUrl })
          .eq('id', f.id);
        feitas++;
      } catch (e) { erros++; }
      setOtim({ total: lista.length, feitas, erros });
    }
    setOtim({ total: lista.length, feitas, erros, fim: true });
    router.refresh();
  }
  const [showParceiros, setShowParceiros] = useState(false);
  const [pNome, setPNome] = useState(''); const [pPct, setPPct] = useState('');
  const [hero, setHero] = useState(initialHero || '');
  const [heroSalvo, setHeroSalvo] = useState(true);
  const [heroFileUrl, setHeroFileUrl] = useState(initialHeroFile || '');
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUrlInput, setHeroUrlInput] = useState('');

  async function subirHeroFile(e) {
    const f = (e.target.files || [])[0];
    e.target.value = '';
    if (!f) return;
    setHeroUploading(true);
    let url = null;
    // tenta R2 (sem limite); senão Supabase (≤50 MB)
    try { url = await uploadToR2(f); } catch (err) { url = null; }
    if (!url) {
      const ext = (f.name.split('.').pop() || 'mp4');
      const path = `hero/home-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('imoveis-videos').upload(path, f, { upsert: true, contentType: f.type });
      if (!error) { const { data: pub } = supabase.storage.from('imoveis-videos').getPublicUrl(path); url = pub.publicUrl; }
    }
    if (url) {
      await supabase.from('site_config').upsert({ key: 'hero_video_file', value: url });
      setHeroFileUrl(url);
    } else {
      alert('Não consegui subir o vídeo. Se for maior que 50 MB, configure o Cloudflare R2 (veja GUIA-VIDEO-R2.md).');
    }
    setHeroUploading(false);
  }
  async function removerHeroFile() {
    await supabase.from('site_config').upsert({ key: 'hero_video_file', value: '' });
    setHeroFileUrl('');
  }
  async function salvarHeroUrl() {
    const url = (heroUrlInput || '').trim();
    if (!url) return;
    await supabase.from('site_config').upsert({ key: 'hero_video_file', value: url });
    setHeroFileUrl(url);
    setHeroUrlInput('');
  }

  async function toggleZap(im) {
    const novo = im.zap_ativo === false;
    await supabase.from('imoveis').update({ zap_ativo: novo }).eq('id', im.id);
    setImoveis(l => l.map(x => x.id === im.id ? { ...x, zap_ativo: novo } : x));
  }
  async function togglePausa(im) {
    const novo = im.status === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('imoveis').update({ status: novo }).eq('id', im.id);
    setImoveis(l => l.map(x => x.id === im.id ? { ...x, status: novo } : x));
  }
  async function excluir(im) {
    if (confirm !== im.id) { setConfirm(im.id); return; }
    setExcluindo(im.id);
    try {
      // 1) fotos no Storage do Supabase
      const { data: fotos } = await supabase.from('imovel_fotos').select('path, url').eq('imovel_id', im.id);
      const paths = (fotos || []).map(f => f.path).filter(Boolean);
      if (paths.length) await supabase.storage.from('imoveis-fotos').remove(paths);
      // 1b) fotos que estão no Cloudflare R2
      for (const f of (fotos || [])) { if (f.url && !f.path) await deleteFromR2(f.url); }
      // 2) vídeo(s) do imóvel no Storage do Supabase (se houver)
      const { data: vids } = await supabase.storage.from('imoveis-videos').list(String(im.id));
      if (vids && vids.length) await supabase.storage.from('imoveis-videos').remove(vids.map(v => `${im.id}/${v.name}`));
      // 3) vídeo no Cloudflare R2 (se a URL for do R2)
      if (im.video_file_url) await deleteFromR2(im.video_file_url);
      // 4) registro no banco (cascade apaga as linhas de imovel_fotos)
      await supabase.from('imoveis').delete().eq('id', im.id);
      setImoveis(l => l.filter(x => x.id !== im.id));
    } catch (e) {
      alert('Não consegui excluir tudo. Tente de novo.');
    }
    setConfirm(null);
    setExcluindo(null);
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
    // grava o vídeo da home na tabela site_config (independe dos imóveis)
    await supabase.from('site_config').upsert({ key: 'hero_video', value: hero.trim() });
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
    .filter(i => !q || i.titulo.toLowerCase().includes(q) || (i.bairro || '').toLowerCase().includes(q) || (i.codigo || '').toLowerCase().includes(q));
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
            <button onClick={() => setShowPortais(v => !v)} style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(232,168,124,.4)', background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>Portais</button>
            <Link href="/admin/novo" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#2A2117', padding: '11px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 700 }}>+ Novo imóvel</Link>
            <button onClick={sair} title="Sair" style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(243,237,227,.15)', background: 'transparent', color: 'var(--muted)', fontSize: 13 }}>Sair</button>
          </div>
        </header>

        <div style={{ padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* VÍDEO DA HOME */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <strong style={{ fontSize: 14, color: 'var(--cream-2)' }}>▶ Vídeo em destaque da home</strong>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--taupe)', marginBottom: 6 }}>OPÇÃO 1 — Link do YouTube</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={hero} onChange={e => { setHero(e.target.value); setHeroSalvo(false); }} placeholder="Cole o link do YouTube ou Shorts…" style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--cream)' }} />
                <button onClick={salvarHero} style={{ padding: '13px 20px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13.5, fontWeight: 700, border: 0 }}>{heroSalvo ? 'Salvo ✓' : 'Salvar'}</button>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Roda automático no computador. No celular, o cliente toca pra assistir.</span>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--taupe)', marginBottom: 6 }}>OPÇÃO 2 — Vídeo que roda sozinho <span style={{ color: 'var(--accent)' }}>(inclusive no iPhone)</span></div>
              {heroFileUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <video src={heroFileUrl} muted playsInline style={{ width: 90, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, background: '#000' }} />
                  <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Vídeo no ar</span>
                  <button onClick={removerHeroFile} style={{ background: 'transparent', border: '1px solid rgba(200,90,70,.35)', color: '#c88a7a', borderRadius: 8, padding: '8px 12px', fontSize: 12.5 }}>Remover</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <input value={heroUrlInput} onChange={e => setHeroUrlInput(e.target.value)} placeholder="Colar link do vídeo (MP4) — ex.: R2, sem limite" style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--cream)' }} />
                    <button onClick={salvarHeroUrl} style={{ padding: '13px 20px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13.5, fontWeight: 700, border: 0 }}>Salvar</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12, margin: '4px 0 8px' }}>
                    <span style={{ flex: 1, height: 1, background: 'var(--line)' }}></span>ou<span style={{ flex: 1, height: 1, background: 'var(--line)' }}></span>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(232,168,124,.5)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(232,168,124,.05)' }}>
                    <input type="file" accept="video/*" onChange={subirHeroFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    {heroUploading ? 'Enviando…' : '↑ Subir do celular (até 50 MB)'}
                  </label>
                </>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>Cole um link .mp4 (Cloudflare R2, grátis e sem limite) para o vídeo rodar sozinho até no iPhone. O upload direto tem limite de 50 MB.</div>
            </div>
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

          {showPortais && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: 'var(--cream-2)' }}>Zap Imóveis · VivaReal · OLX</strong>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)', background: 'rgba(168,192,143,.15)', padding: '4px 9px', borderRadius: 5 }}>{noPortal} ANÚNCIO(S) PRONTO(S)</span>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--taupe)', marginBottom: 6 }}>ENDEREÇO DO FEED — cole no Canal Pro</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input readOnly value={feedUrl} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 220, background: 'var(--bg)', border: '1px solid rgba(232,168,124,.3)', borderRadius: 10, padding: '13px 15px', fontSize: 14, color: 'var(--accent)' }} />
                  <button onClick={() => { navigator.clipboard?.writeText(feedUrl); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}
                    style={{ padding: '13px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13, fontWeight: 700, border: 0 }}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
                  <a href={feedUrl} target="_blank" rel="noopener" style={{ padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(243,237,227,.18)', color: 'var(--sand)', fontSize: 13 }}>Abrir</a>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>O Grupo OLX lê este endereço sozinho, 2× por dia. Você não cadastra imóvel no portal — só aqui.</div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--taupe)', marginBottom: 6 }}>E-MAIL DA IMOBILIÁRIA <span style={{ color: '#c8a87a' }}>(obrigatório pelo portal)</span></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={zapEmail} onChange={e => { setZapEmail(e.target.value); setZapSalvo(false); }} placeholder="contato@jasondias.com.br" type="email" style={{ flex: 1, minWidth: 220, background: 'var(--bg)', border: `1px solid ${zapEmail ? 'rgba(243,237,227,.15)' : 'rgba(200,168,122,.5)'}`, borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--cream)' }} />
                  <button onClick={salvarZapEmail} style={{ padding: '13px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13, fontWeight: 700, border: 0 }}>{zapSalvo ? 'Salvo ✓' : 'Salvar'}</button>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>É para onde o portal manda os leads de e-mail. Sem ele, os anúncios são recusados.</div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[['no-portal', `No portal (${listaPortal.no.length})`], ['fora', `Fora (${listaPortal.fora.length})`], ['pendente', `Falta algo (${listaPortal.pendente.length})`]].map(([k, label]) => (
                    <button key={k} onClick={() => setAbaPortal(k)} style={{ padding: '7px 13px', borderRadius: 999, fontSize: 12, fontWeight: abaPortal === k ? 700 : 400, background: abaPortal === k ? 'var(--cream)' : 'transparent', color: abaPortal === k ? '#2A2117' : 'var(--sand)', border: `1px solid ${abaPortal === k ? 'var(--cream)' : 'rgba(243,237,227,.2)'}` }}>{label}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(abaPortal === 'no-portal' ? listaPortal.no : abaPortal === 'fora' ? listaPortal.fora : listaPortal.pendente).map(({ im, motivo }) => (
                    <div key={im.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px' }}>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--sand)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{im.codigo ? `${im.codigo} · ` : ''}{im.titulo}</span>
                        {motivo && <span style={{ fontSize: 11, color: '#c8a87a' }}>falta: {motivo}</span>}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                        {motivo && motivo !== 'desligado para portais' && (
                          <Link href={`/admin/novo?id=${im.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}>corrigir</Link>
                        )}
                        <button onClick={() => toggleZap(im)} title={im.zap_ativo === false ? 'Colocar no portal' : 'Tirar do portal'}
                          style={{ width: 46, height: 26, flex: 'none', borderRadius: 999, border: 0, padding: 3, background: im.zap_ativo === false ? 'rgba(243,237,227,.14)' : 'var(--green)', display: 'flex', justifyContent: im.zap_ativo === false ? 'flex-start' : 'flex-end' }}>
                          <span style={{ width: 20, height: 20, borderRadius: 999, background: '#F3EDE3', display: 'block' }}></span>
                        </button>
                      </span>
                    </div>
                  ))}
                  {(abaPortal === 'no-portal' ? listaPortal.no : abaPortal === 'fora' ? listaPortal.fora : listaPortal.pendente).length === 0 && (
                    <div style={{ textAlign: 'center', padding: 18, fontSize: 12.5, color: 'var(--muted)' }}>Nenhum imóvel aqui.</div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                Regras do portal: mínimo de <strong style={{ color: 'var(--sand)' }}>5 fotos</strong> por anúncio, CEP obrigatório, e o vídeo precisa ser do <strong style={{ color: 'var(--sand)' }}>YouTube</strong> (vídeo próprio não é aceito lá — no nosso site continua funcionando).
              </div>
            </div>
          )}

          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código, título ou bairro…" style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 16, color: 'var(--cream)' }} />

          {/* OTIMIZAR FOTOS ANTIGAS */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream-2)' }}>Acelerar fotos antigas</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                {otim && !otim.fim ? `Processando ${otim.feitas} de ${otim.total}… deixe esta tela aberta.`
                  : otim && otim.fim ? (otim.total === 0 ? 'Tudo já está otimizado ✓' : `Pronto: ${otim.feitas} fotos otimizadas${otim.erros ? ` · ${otim.erros} falharam` : ''}.`)
                  : 'Reprocessa as fotos já publicadas para carregarem na hora.'}
              </div>
            </div>
            <button onClick={otimizarFotos} disabled={otim && !otim.fim}
              style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(232,168,124,.4)', background: otim && !otim.fim ? 'transparent' : 'rgba(232,168,124,.12)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, opacity: otim && !otim.fim ? 0.6 : 1 }}>
              {otim && !otim.fim ? 'Otimizando…' : 'Otimizar agora'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[['todos', `Todos (${imoveis.length})`], ['ativos', `Ativos (${ativos})`], ['pausados', `Pausados (${pausados})`]].map(([k, label]) => (
              <button key={k} onClick={() => setAba(k)} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: aba === k ? 700 : 400, background: aba === k ? 'var(--cream)' : 'transparent', color: aba === k ? '#2A2117' : 'var(--cream)', border: `1px solid ${aba === k ? 'var(--cream)' : 'rgba(243,237,227,.25)'}` }}>{label}</button>
            ))}
          </div>

          {lista.map(im => {
            const vid = ytId(im.youtube_url);
            const pausado = im.status === 'pausado';
            const f0 = (im.imovel_fotos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0];
            const foto0 = f0?.thumb_url || f0?.url;
            const thumb = vid ? ytThumb(vid) : (im.capa_url || foto0 || '');
            return (
              <div key={im.id} style={{ display: 'flex', gap: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, opacity: pausado ? 0.55 : 1 }}>
                {thumb ? (
                  <div style={{ width: 74, flex: 'none', aspectRatio: '9/14', borderRadius: 10, background: `url("${thumb}") center/cover` }} />
                ) : im.video_file_url ? (
                  <video src={im.video_file_url} muted playsInline preload="metadata" style={{ width: 74, flex: 'none', aspectRatio: '9/14', borderRadius: 10, objectFit: 'cover', background: '#000' }} />
                ) : (
                  <div style={{ width: 74, flex: 'none', aspectRatio: '9/14', borderRadius: 10, background: 'linear-gradient(150deg,#6B5A44,#463928)' }} />
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream-2)' }}>{im.titulo}</span>
                      {im.codigo && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', padding: '3px 8px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--taupe)' }}>{im.codigo}</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: pausado ? 'rgba(243,237,227,.1)' : 'rgba(168,192,143,.15)', color: pausado ? 'var(--taupe)' : 'var(--green)' }}>{pausado ? 'PAUSADO' : 'NO AR'}</span>
                      {!pausado && im.zap_ativo !== false && !motivoInapto(im) && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(120,150,200,.15)', border: '1px solid rgba(120,150,200,.3)', color: '#9db4d8' }}>PORTAL</span>}
                      {im.parceiros?.nome && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(232,168,124,.12)', border: '1px solid rgba(232,168,124,.3)', color: 'var(--accent)' }}>{im.parceiros.nome}{im.parceiro_pct ? ` · ${im.parceiro_pct}%` : ''}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--taupe)', marginTop: 3 }}>{im.bairro} · {formatPreco(im.preco_cents)}{im.finalidade === 'aluguel' ? '/mês' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href={`/admin/novo?id=${im.id}`} style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(232,168,124,.12)', border: '1px solid rgba(232,168,124,.35)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }}>Editar</Link>
                    <button onClick={() => togglePausa(im)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(243,237,227,.18)', background: 'transparent', color: 'var(--sand)', fontSize: 12.5, fontWeight: 600 }}>{pausado ? 'Reativar' : 'Pausar'}</button>
                    <button onClick={() => excluir(im)} disabled={excluindo === im.id} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(200,90,70,.3)', background: confirm === im.id ? 'rgba(200,90,70,.15)' : 'transparent', color: '#c88a7a', fontSize: 12.5, fontWeight: 600 }}>{excluindo === im.id ? 'Excluindo…' : confirm === im.id ? 'Confirmar exclusão?' : 'Excluir'}</button>
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
