'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ytId, ytThumb, ytEmbed, MOBILIA_LABELS, whatsappLink, formatPreco } from '../../../lib/format';

export default function DetailClient({ im, precoFmt }) {
  const vid = ytId(im.youtube_url);
  const nativo = !vid && im.video_file_url;
  const fotos = Array.isArray(im.fotos) ? im.fotos : [];
  const slides = ((vid || nativo) ? [{ video: true }] : []).concat(fotos.map(f => ({ bg: f.url || f, thumb: f.thumb_url || null })));
  if (slides.length === 0) slides.push({ bg: im.capa_url || '' });
  const [idx, setIdx] = useState(0);
  const [origin, setOrigin] = useState('');
  const [full, setFull] = useState(false);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    if (!full) return;
    const el = fullTrackRef.current;
    if (el) el.scrollLeft = el.clientWidth * idx;
    const onKey = (e) => {
      if (e.key === 'Escape') setFull(false);
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [full, idx, slides.length]);
  // swipe: trilha com rolagem nativa (fluido no celular) — sincroniza o índice
  const trackRef = useRef(null);
  const fullTrackRef = useRef(null);
  const scrollTo = (ref, k) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * k, behavior: 'smooth' });
  };
  const onTrackScroll = (e) => {
    const el = e.currentTarget;
    const k = Math.round(el.scrollLeft / el.clientWidth);
    if (k !== idx) setIdx(Math.max(0, Math.min(slides.length - 1, k)));
  };
  const go = (k) => {
    const t = Math.max(0, Math.min(slides.length - 1, k));
    setIdx(t);
    scrollTo(full ? fullTrackRef : trackRef, t);
  };
  const cur = slides[idx] || {};
  const wa = whatsappLink(`Olá! Tenho interesse no imóvel ${im.codigo ? `(cód. ${im.codigo}) ` : ''}"${im.titulo}" no ${im.bairro}. Pode me passar mais informações?`);

  const taxa = (tipo, cents) => tipo === 'isento' ? 'Isento'
    : tipo === 'incluso' ? 'Incluso no aluguel'
    : tipo === 'nao_informado' ? null
    : (cents ? formatPreco(cents) : null);

  const feats = [
    ['Quartos', im.quartos], ['Banheiros', im.banheiros], ['Vagas', im.vagas],
    ['Área', im.area_m2 ? `${im.area_m2} m²` : null], ['Andar', im.andar], ['Tipo', im.categoria], ['Mobília', MOBILIA_LABELS[im.mobilia]],
    ['Condomínio', taxa(im.condominio_tipo, im.condominio_cents)], ['IPTU', taxa(im.iptu_tipo, im.iptu_cents)]
  ].filter(([, v]) => v);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="Jason Dias Imóveis">
          <img src="/logo-jason-dias.jpg" alt="Jason Dias Imóveis" style={{ height: 34, width: 'auto', mixBlendMode: 'screen' }} />
        </Link>
        <a href={wa} target="_blank" rel="noopener" style={{ background: 'var(--accent)', color: '#2A2117', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>WhatsApp</a>
      </header>

      <div className="container" style={{ paddingTop: 20, paddingBottom: 90 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--taupe)', padding: '10px 0' }}>← Voltar aos imóveis</Link>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
          {/* MÍDIA */}
          <div style={{ width: 360, maxWidth: '100%', flex: '1 1 320px', position: 'relative', aspectRatio: '9/16', maxHeight: 640, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(150deg,#6B5A44,#463928)', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
            <div ref={trackRef} onScroll={onTrackScroll} className="no-scrollbar"
              style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              {slides.map((s, k) => (
                <div key={k} style={{ flex: '0 0 100%', width: '100%', height: '100%', position: 'relative', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}>
                  {s.video ? (
                    vid ? (
                      <iframe src={ytEmbed(vid, { controls: 1, origin })} referrerPolicy="strict-origin-when-cross-origin" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; encrypted-media" allowFullScreen title={im.titulo} />
                    ) : (
                      <video src={im.video_file_url} controls autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    )
                  ) : (
                    <>
                      {s.thumb && <img src={s.thumb} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px)', transform: 'scale(1.04)' }} />}
                      <img src={s.bg} alt={`${im.titulo} — foto ${k}`} onClick={() => setFull(true)}
                        loading={k <= 2 ? 'eager' : 'lazy'} fetchPriority={k <= 1 ? 'high' : 'auto'} decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                    </>
                  )}
                </div>
              ))}
            </div>
            {!cur.video && (
              <button onClick={() => setFull(true)} style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(31,24,18,.75)', color: '#F3EDE3', border: 0, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', zIndex: 6 }}>⤢ Tela cheia</button>
            )}
            {idx > 0 && <button onClick={() => go(idx - 1)} style={navBtn('left')}>‹</button>}
            {idx < slides.length - 1 && <button onClick={() => go(idx + 1)} style={navBtn('right')}>›</button>}
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 6 }}>
              {slides.map((_, k) => (
                <button key={k} onClick={() => go(k)} style={{ width: k === idx ? 20 : 6, height: 6, borderRadius: 999, border: 0, background: k === idx ? 'var(--accent)' : 'rgba(243,237,227,.5)', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>

          {/* INFO */}
          <div style={{ flex: '2 1 380px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <span style={{ display: 'inline-flex', background: 'rgba(31,24,18,.6)', border: '1px solid var(--line)', color: im.finalidade === 'aluguel' ? 'var(--accent)' : 'var(--green)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '6px 12px', borderRadius: 6, marginBottom: 14 }}>{im.finalidade === 'aluguel' ? 'ALUGUEL' : 'VENDA'}</span>
              {im.codigo && <span style={{ display: 'inline-flex', marginLeft: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--taupe)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '6px 12px', borderRadius: 6, marginBottom: 14 }}>CÓD. {im.codigo}</span>}
              <h1 style={{ fontSize: 32, lineHeight: 1.15, color: 'var(--cream-2)', margin: 0 }}>{im.titulo}</h1>
              <div style={{ fontSize: 15, color: 'var(--taupe)', marginTop: 8 }}>{im.bairro} · João Pessoa</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{precoFmt}<span style={{ fontSize: 15, fontWeight: 400, color: 'var(--taupe)' }}>{im.finalidade === 'aluguel' ? '/mês' : ''}</span></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 440 }}>
              {feats.map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream-2)' }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {im.descricao && <p style={{ fontSize: 14.5, color: 'var(--sand)', lineHeight: 1.65, maxWidth: 560 }}>{im.descricao}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', maxWidth: 440 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--cream-2)' }}>📍 {im.bairro} · João Pessoa</div>
              {im.referencia && <div style={{ fontSize: 13, color: 'var(--taupe)', lineHeight: 1.5 }}>{im.referencia}</div>}
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>🔒 Endereço exato informado no WhatsApp</div>
            </div>

            <a href={wa} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--accent)', color: '#2A2117', padding: 16, borderRadius: 12, fontSize: 15.5, fontWeight: 700, maxWidth: 440 }}>Tenho interesse — falar no WhatsApp</a>
          </div>
        </div>
      </div>
      {/* TELA CHEIA */}
      {full && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0F0B08' }}>
          <div ref={fullTrackRef} onScroll={onTrackScroll} className="no-scrollbar"
            style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
            {slides.map((s, k) => (
              <div key={k} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.video ? (
                  vid ? (
                    <iframe src={ytEmbed(vid, { controls: 1, origin })} referrerPolicy="strict-origin-when-cross-origin" style={{ width: 'min(100vw, 56.25vh)', height: 'min(100vh, 177.78vw)', border: 0 }} allow="autoplay; encrypted-media" allowFullScreen title={im.titulo} />
                  ) : (
                    <video src={im.video_file_url} controls autoPlay muted loop playsInline style={{ maxWidth: '100vw', maxHeight: '100vh' }} />
                  )
                ) : (
                  <img src={s.bg} alt={`${im.titulo} — foto ${k}`} loading={Math.abs(k - idx) <= 1 ? 'eager' : 'lazy'} decoding="async"
                    style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }} />
                )}
              </div>
            ))}
          </div>

          <button onClick={() => setFull(false)} aria-label="Fechar"
            style={{ position: 'fixed', top: 16, right: 16, width: 44, height: 44, borderRadius: 999, background: 'rgba(243,237,227,.14)', color: '#F3EDE3', border: 0, fontSize: 22, cursor: 'pointer', zIndex: 102 }}>×</button>

          <div style={{ position: 'fixed', top: 22, left: 20, fontSize: 13, color: 'rgba(243,237,227,.7)', letterSpacing: '.04em', zIndex: 102 }}>{idx + 1} / {slides.length}</div>

          {idx > 0 && <button onClick={() => go(idx - 1)} style={fullNav('left')}>‹</button>}
          {idx < slides.length - 1 && <button onClick={() => go(idx + 1)} style={fullNav('right')}>›</button>}

          <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '8px 10px', background: 'rgba(31,24,18,.6)', borderRadius: 12, maxWidth: 'calc(100vw - 40px)', overflowX: 'auto', zIndex: 102 }}>
            {slides.map((s, k) => (
              <button key={k} onClick={() => go(k)} style={{ width: 44, height: 44, flex: 'none', borderRadius: 8, border: k === idx ? '2px solid var(--accent)' : '2px solid transparent', padding: 0, overflow: 'hidden', background: s.video ? '#2A2117' : `url("${s.thumb || s.bg}") center/cover`, color: '#F3EDE3', fontSize: 14, cursor: 'pointer' }}>{s.video ? '▶' : ''}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const fullNav = (side) => ({
  position: 'fixed', [side]: 14, top: '50%', transform: 'translateY(-50%)',
  width: 52, height: 52, borderRadius: 999, background: 'rgba(243,237,227,.14)', color: '#F3EDE3',
  border: 0, fontSize: 26, cursor: 'pointer', zIndex: 101
});

const navBtn = (side) => ({
  position: 'absolute', [side]: 10, top: '50%', transform: 'translateY(-50%)',
  width: 44, height: 44, borderRadius: 999, background: 'rgba(31,24,18,.75)', color: '#F3EDE3',
  border: 0, fontSize: 22, cursor: 'pointer', zIndex: 5
});
