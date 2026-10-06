'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MOBILIA_LABELS, ytId, ytThumb, ytEmbed, formatPreco } from '../lib/format';

// Cartão de imóvel usado na home e nos "Imóveis parecidos".
// compacto = celular em 2 colunas (texto menor, foto 3:4).
// autoVideo = toca a prévia do vídeo quando o cartão aparece (só no computador,
// para não abrir vários vídeos ao mesmo tempo no 4G).
export default function CardImovel({ im, compacto = false, autoVideo = true, priority = false, origin = '', onAbrir }) {
  const vid = ytId(im.youtube_url);
  const nativo = !vid && im.video_file_url;
  const f0 = (im.imovel_fotos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0];
  const foto0 = f0?.thumb_url || f0?.url;
  const capa = vid ? ytThumb(vid) : (im.capa_url || foto0 || '');
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!autoVideo || !nativo || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.55 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [nativo, autoVideo]);
  const tocar = autoVideo && nativo && (visivel || hover);

  return (
    <Link ref={ref} href={`/imovel/${im.slug}`} onClick={onAbrir}
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: compacto ? 12 : 16, overflow: 'hidden', display: 'block', minWidth: 0 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ position: 'relative', aspectRatio: compacto ? '3/4' : '9/16', background: 'linear-gradient(150deg,#6B5A44,#463928)', overflow: 'hidden' }}>
        {capa && (
          <img src={capa} alt={im.titulo || im.categoria} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {autoVideo && vid && hover && (
          <iframe src={ytEmbed(vid, { controls: 0, origin })} referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }} title={im.titulo} />
        )}
        {tocar && (
          <video src={im.video_file_url} muted loop playsInline autoPlay preload="metadata"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span style={{ position: 'absolute', top: compacto ? 8 : 12, left: compacto ? 8 : 12, background: 'rgba(31,24,18,.85)', color: im.finalidade === 'aluguel' ? 'var(--accent)' : 'var(--green)', fontSize: compacto ? 9.5 : 10.5, fontWeight: 700, letterSpacing: '.12em', padding: compacto ? '4px 7px' : '5px 10px', borderRadius: 6 }}>
          {im.finalidade === 'aluguel' ? 'ALUGUEL' : 'VENDA'}
        </span>
        {(vid || nativo) && (
          <span style={{ position: 'absolute', bottom: compacto ? 8 : 12, left: compacto ? 8 : 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(31,24,18,.72)', color: 'var(--cream)', fontSize: compacto ? 10 : 11, padding: compacto ? '4px 7px' : '5px 9px', borderRadius: 6 }}>▶ {compacto ? 'Tour' : 'Tour em vídeo'}</span>
        )}
      </div>
      <div style={{ padding: compacto ? '10px 11px 12px' : '16px 18px 18px' }}>
        <div style={{ fontSize: compacto ? 16.5 : 21, fontWeight: 700, color: 'var(--cream-2)', letterSpacing: '-.01em' }}>
          {formatPreco(im.preco_cents)}<span style={{ fontSize: compacto ? 11.5 : 13, fontWeight: 400, color: 'var(--taupe)' }}>{im.finalidade === 'aluguel' ? '/mês' : ''}</span>
        </div>
        {compacto ? (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--cream)', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.bairro}</div>
            <div style={{ fontSize: 11.5, color: 'var(--taupe)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[im.quartos ? `${im.quartos} qto${im.quartos > 1 ? 's' : ''}` : null, im.area_m2 ? `${im.area_m2} m²` : null, im.vagas ? `${im.vagas} vaga${im.vagas > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--sand)', margin: '6px 0 12px', lineHeight: 1.4 }}>{im.titulo ? `${im.titulo}` : im.categoria} · <strong style={{ color: 'var(--cream)', fontWeight: 600 }}>{im.bairro}</strong></div>
            <div style={{ display: 'flex', gap: '8px 14px', fontSize: 12.5, color: 'var(--taupe)', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              {im.quartos ? <span>{im.quartos} quartos</span> : null}
              {im.banheiros ? <span>{im.banheiros} banh.</span> : null}
              {im.vagas ? <span>{im.vagas} vagas</span> : null}
              {im.area_m2 ? <span>{im.area_m2} m²</span> : null}
              {im.mobilia ? <span>{MOBILIA_LABELS[im.mobilia]}</span> : null}
              {im.codigo ? <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 11 }}>{im.codigo}</span> : null}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
