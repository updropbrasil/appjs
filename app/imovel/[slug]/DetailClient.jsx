'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ytId, ytThumb, ytEmbed, MOBILIA_LABELS, whatsappLink } from '../../../lib/format';

export default function DetailClient({ im, precoFmt }) {
  const vid = ytId(im.youtube_url);
  const nativo = !vid && im.video_file_url;
  const fotos = Array.isArray(im.fotos) ? im.fotos : [];
  const slides = ((vid || nativo) ? [{ video: true }] : []).concat(fotos.map(f => ({ bg: f.url || f })));
  if (slides.length === 0) slides.push({ bg: im.capa_url || '' });
  const [idx, setIdx] = useState(0);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const cur = slides[idx] || {};
  const wa = whatsappLink(`Olá! Tenho interesse no imóvel "${im.titulo}" no ${im.bairro}. Pode me passar mais informações?`);

  const feats = [
    ['Quartos', im.quartos], ['Banheiros', im.banheiros], ['Vagas', im.vagas],
    ['Área', im.area_m2 ? `${im.area_m2} m²` : null], ['Andar', im.andar], ['Tipo', im.categoria], ['Mobília', MOBILIA_LABELS[im.mobilia]]
  ].filter(([, v]) => v);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
        <Link href="/" className="serif" style={{ fontSize: 20, letterSpacing: '.04em', color: 'var(--cream-2)' }}>JASON DIAS</Link>
        <a href={wa} target="_blank" rel="noopener" style={{ background: 'var(--accent)', color: '#2A2117', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>WhatsApp</a>
      </header>

      <div className="container" style={{ padding: '20px 48px 90px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--taupe)', padding: '10px 0' }}>← Voltar aos imóveis</Link>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
          {/* MÍDIA */}
          <div style={{ width: 360, maxWidth: '100%', flex: '1 1 320px', position: 'relative', aspectRatio: '9/16', maxHeight: 640, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(150deg,#6B5A44,#463928)', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
            {cur.video ? (
              vid ? (
                <iframe src={ytEmbed(vid, { controls: 1, origin })} referrerPolicy="strict-origin-when-cross-origin" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; encrypted-media" allowFullScreen title={im.titulo} />
              ) : (
                <video src={im.video_file_url} controls autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: cur.bg ? `url("${cur.bg}") center/cover` : 'transparent' }} />
            )}
            {idx > 0 && <button onClick={() => setIdx(idx - 1)} style={navBtn('left')}>‹</button>}
            {idx < slides.length - 1 && <button onClick={() => setIdx(idx + 1)} style={navBtn('right')}>›</button>}
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {slides.map((_, k) => (
                <button key={k} onClick={() => setIdx(k)} style={{ width: k === idx ? 20 : 6, height: 6, borderRadius: 999, border: 0, background: k === idx ? 'var(--accent)' : 'rgba(243,237,227,.5)', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>

          {/* INFO */}
          <div style={{ flex: '2 1 380px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <span style={{ display: 'inline-flex', background: 'rgba(31,24,18,.6)', border: '1px solid var(--line)', color: im.finalidade === 'aluguel' ? 'var(--accent)' : 'var(--green)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '6px 12px', borderRadius: 6, marginBottom: 14 }}>{im.finalidade === 'aluguel' ? 'ALUGUEL' : 'VENDA'}</span>
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
    </div>
  );
}

const navBtn = (side) => ({
  position: 'absolute', [side]: 10, top: '50%', transform: 'translateY(-50%)',
  width: 44, height: 44, borderRadius: 999, background: 'rgba(31,24,18,.75)', color: '#F3EDE3',
  border: 0, fontSize: 22, cursor: 'pointer', zIndex: 5
});
