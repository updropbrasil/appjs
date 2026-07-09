'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MOBILIA_LABELS, ytId, ytThumb, ytEmbed, formatPreco, maskThousands, whatsappLink } from '../lib/format';

const BAIRROS = ['Cabo Branco', 'Manaíra', 'Tambaú', 'Bessa', 'Altiplano', 'Intermares'];
const CATEGORIAS = ['Apartamento', 'Casa', 'Cobertura', 'Flat / Studio'];
const MOBILIAS = [
  { k: 'todos', label: 'Todas' }, { k: 'mobiliado', label: 'Mobiliado' },
  { k: 'semi', label: 'Semimobiliado' }, { k: 'sem', label: 'Sem mobília' },
  { k: 'planejados', label: 'Com planejados' }
];

export default function PortalClient({ imoveis, heroVideo, heroVideoFile }) {
  const [filter, setFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [fBairro, setFBairro] = useState('');
  const [fTipo, setFTipo] = useState('todos');
  const [fMin, setFMin] = useState('');
  const [fMax, setFMax] = useState('');
  const [fMobilia, setFMobilia] = useState('todos');
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [active, setActive] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const on = () => setIsMobile(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const heroYt = ytId(heroVideo);
  const wa = whatsappLink('Olá! Vi um imóvel no site e tenho interesse.');
  const goToList = (f) => {
    setFilter(f);
    const el = document.getElementById('lista');
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  };

  const num = (v) => { const n = String(v).replace(/\D/g, ''); return n ? Number(n) : null; };
  const pMin = num(fMin), pMax = num(fMax), bairroQ = fBairro.trim().toLowerCase();

  const lista = useMemo(() => imoveis
    .filter(i => filter === 'todos' || i.finalidade === filter)
    .filter(i => !bairroQ || (i.bairro || '').toLowerCase().includes(bairroQ))
    .filter(i => fTipo === 'todos' || i.categoria === fTipo)
    .filter(i => pMin == null || i.preco_cents >= pMin * 100)
    .filter(i => pMax == null || i.preco_cents <= pMax * 100)
    .filter(i => fMobilia === 'todos' || i.mobilia === fMobilia),
    [imoveis, filter, bairroQ, fTipo, pMin, pMax, fMobilia]);

  const activeCount = [fTipo !== 'todos', fMobilia !== 'todos', !!bairroQ, pMin != null, pMax != null].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(31,24,18,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '14px 20px' : '16px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span className="serif" style={{ fontSize: 20, letterSpacing: '.04em', color: 'var(--cream-2)' }}>JASON DIAS</span>
            <span style={{ fontSize: 10, letterSpacing: '.22em', color: 'var(--taupe)' }}>IMÓVEIS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 28 }}>
            {!isMobile && (
              <nav style={{ display: 'flex', gap: 26, fontSize: 14, color: 'var(--sand)' }}>
                <button onClick={() => goToList('aluguel')} style={navLink}>Alugar</button>
                <button onClick={() => goToList('venda')} style={navLink}>Comprar</button>
                <button onClick={() => goToList('todos')} style={navLink}>Imóveis</button>
              </nav>
            )}
            <a href={wa} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#2A2117', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: 'min(82vh, 660px)', background: heroYt ? `#2A2117 url("https://i.ytimg.com/vi/${heroYt}/hqdefault.jpg") center/cover` : 'linear-gradient(200deg,#4A3B2A,#2A2117 60%,#1F1812)', overflow: 'hidden', display: 'flex' }}>
        {heroVideoFile && (
          <video src={heroVideoFile} autoPlay muted loop playsInline preload="auto"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', minWidth: '100%', minHeight: '100%', objectFit: 'cover', border: 0 }} />
        )}
        {!heroVideoFile && heroYt && !heroPlaying && !isMobile && origin && (
          <iframe src={ytEmbed(heroYt, { controls: 0, origin })} referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '100vw', height: '56.25vw', minHeight: '100%', minWidth: '177.78vh', border: 0, pointerEvents: 'none' }} title="Vídeo em destaque" />
        )}
        {!heroPlaying && (heroVideoFile || heroYt) && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to top, #1F1812 5%, rgba(31,24,18,0.55) 30%, rgba(31,24,18,0.15) 55%, transparent 78%), linear-gradient(to right, rgba(31,24,18,0.65) 0%, rgba(31,24,18,0.15) 45%, transparent 70%)' }} />
        )}
        {!heroVideoFile && heroYt && heroPlaying && (
          <iframe src={ytEmbed(heroYt, { mute: 0, controls: 1, loop: 0, origin })} referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, zIndex: 3 }} allow="autoplay; encrypted-media" allowFullScreen title="Tour em destaque" />
        )}
        {!heroPlaying && (
          <div className="container" style={{ position: 'relative', zIndex: 2, alignSelf: 'flex-end', width: '100%', padding: isMobile ? '0 20px 40px' : '0 56px 56px' }}>
            <div style={{ maxWidth: 620, paddingTop: 120 }}>
              <div style={{ display: 'inline-flex', gap: 8, fontSize: 10.5, letterSpacing: '.2em', color: 'var(--accent)', border: '1px solid rgba(232,168,124,.4)', padding: '6px 12px', borderRadius: 999, marginBottom: 18 }}>JOÃO PESSOA · PB</div>
              <h1 style={{ fontSize: 'clamp(26px, 4vw, 48px)', lineHeight: 1.14, color: 'var(--cream-2)', margin: 0, textShadow: '0 2px 24px rgba(0,0,0,.45)' }}>Morar bem em João Pessoa começa com um bom tour</h1>
              <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: 'var(--cream)', marginTop: 14, maxWidth: 460, lineHeight: 1.55, textShadow: '0 1px 12px rgba(0,0,0,.5)' }}>Todos os nossos imóveis têm tour guiado em vídeo. Conheça por dentro antes de agendar a visita.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => goToList('aluguel')} style={{ background: 'var(--accent)', color: '#2A2117', padding: '13px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 0, cursor: 'pointer' }}>Ver imóveis para alugar</button>
                <button onClick={() => goToList('venda')} style={{ border: '1px solid rgba(243,237,227,.5)', background: 'rgba(31,24,18,.25)', color: 'var(--cream)', padding: '13px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>À venda</button>
                {!heroVideoFile && heroYt && <button onClick={() => setHeroPlaying(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, color: 'var(--cream)', fontSize: 13, cursor: 'pointer', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, background: 'rgba(31,24,18,.5)', border: '1px solid rgba(243,237,227,.4)' }}>▶</span> Assistir com som</button>}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* LISTA */}
      <section id="lista" className="container" style={{ padding: isMobile ? '28px 20px 40px' : '36px 56px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
          <h2 style={{ fontSize: 24, color: 'var(--cream-2)', margin: 0 }}>Imóveis disponíveis</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['todos', 'aluguel', 'venda'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
                {f === 'todos' ? 'Todos' : f === 'aluguel' ? 'Aluguel' : 'Venda'}
              </button>
            ))}
            <button onClick={() => setShowFilters(v => !v)} style={{ ...chip(false), borderColor: 'rgba(232,168,124,.45)', color: 'var(--accent)' }}>
              Filtros {activeCount > 0 ? `(${activeCount})` : ''}
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(243,237,227,.1)', borderRadius: 16, padding: 20, marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Group label="BAIRRO">
              <input value={fBairro} onChange={e => setFBairro(e.target.value)} placeholder="Digite o bairro… ex.: Cabo Branco" style={inp} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
                {BAIRROS.map(b => <button key={b} onClick={() => setFBairro(fBairro.toLowerCase() === b.toLowerCase() ? '' : b)} style={chip(fBairro.toLowerCase() === b.toLowerCase())}>{b}</button>)}
              </div>
            </Group>
            <Group label="FAIXA DE VALOR">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '0 14px', width: 180 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>R$</span>
                  <input value={maskThousands(fMin)} onChange={e => setFMin(e.target.value)} placeholder="mínimo" inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 16, color: 'var(--cream)' }} />
                </div>
                <span style={{ color: 'var(--muted)' }}>até</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '0 14px', width: 180 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>R$</span>
                  <input value={maskThousands(fMax)} onChange={e => setFMax(e.target.value)} placeholder="máximo" inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 16, color: 'var(--cream)' }} />
                </div>
              </div>
            </Group>
            <Group label="TIPO DE IMÓVEL">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => setFTipo('todos')} style={chip(fTipo === 'todos')}>Todos</button>
                {CATEGORIAS.map(c => <button key={c} onClick={() => setFTipo(c)} style={chip(fTipo === c)}>{c}</button>)}
              </div>
            </Group>
            <Group label="MOBÍLIA">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MOBILIAS.map(m => <button key={m.k} onClick={() => setFMobilia(m.k)} style={chip(fMobilia === m.k)}>{m.label}</button>)}
              </div>
            </Group>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--sand)' }}>{lista.length} {lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</span>
              {activeCount > 0 && <button onClick={() => { setFBairro(''); setFTipo('todos'); setFMin(''); setFMax(''); setFMobilia('todos'); }} style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>Limpar filtros</button>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 20 }}>
          {lista.map(im => <Card key={im.id} im={im} active={active === im.id} setActive={setActive} origin={origin} />)}
        </div>
        {lista.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Nenhum imóvel encontrado com esses filtros.</div>}
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '40px 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 28 }}>
          {[['1', 'Assista ao tour', 'Vídeo guiado por nós, cômodo por cômodo, sem surpresas.'],
            ['2', 'Gostou? Chame no WhatsApp', 'Atendimento direto com quem conhece o imóvel de verdade.'],
            ['3', 'Visite só o que vale a pena', 'Você chega na visita já decidido — sem perder tempo.']].map(([n, t, d]) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="serif" style={{ fontSize: 26, color: 'var(--accent)' }}>{n}</span>
              <strong style={{ fontSize: 15, color: 'var(--cream-2)' }}>{t}</strong>
              <span style={{ fontSize: 13.5, color: 'var(--taupe)', lineHeight: 1.55 }}>{d}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: isMobile ? '24px 20px 32px' : '24px 56px', color: 'var(--muted)', fontSize: 12.5 }}>
        <span className="serif" style={{ color: 'var(--sand)', fontSize: 14 }}>JASON DIAS IMÓVEIS <span style={{ fontFamily: 'Karla, sans-serif', fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em' }}>· CRECI 8085</span></span>
        <span>João Pessoa · PB — Aluguel e venda de médio-alto padrão</span>
        <Link href="/admin/login" style={{ fontSize: 11.5, color: '#6b5f4e' }}>Área do corretor</Link>
      </footer>
    </div>
  );
}

function Card({ im, active, setActive, origin }) {
  const vid = ytId(im.youtube_url);
  const nativo = !vid && im.video_file_url;
  const foto0 = (im.imovel_fotos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0]?.url;
  const capa = vid ? ytThumb(vid) : (im.capa_url || foto0 || '');
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!nativo || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.55 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [nativo]);
  const playNativo = nativo && (visible || active);
  return (
    <Link ref={ref} href={`/imovel/${im.slug}`} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'block' }}
      onMouseEnter={() => setActive(im.id)} onMouseLeave={() => setActive(null)}>
      <div style={{ position: 'relative', aspectRatio: '9/16', background: 'linear-gradient(150deg,#6B5A44,#463928)', overflow: 'hidden' }}>
        {capa && (
          <img src={capa} alt={im.titulo || im.categoria} loading="lazy" decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {vid && active && (
          <iframe src={ytEmbed(vid, { controls: 0, origin })} referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }} title={im.titulo} />
        )}
        {playNativo && (
          <video src={im.video_file_url} muted loop playsInline autoPlay preload="metadata"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(31,24,18,.85)', color: im.finalidade === 'aluguel' ? 'var(--accent)' : 'var(--green)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '5px 10px', borderRadius: 6 }}>
          {im.finalidade === 'aluguel' ? 'ALUGUEL' : 'VENDA'}
        </span>
        {(vid || nativo) && (
          <span style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(31,24,18,.72)', color: 'var(--cream)', fontSize: 11, padding: '5px 9px', borderRadius: 6 }}>▶ Tour em vídeo</span>
        )}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--cream-2)', letterSpacing: '-.01em' }}>{formatPreco(im.preco_cents)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--taupe)' }}>{im.finalidade === 'aluguel' ? '/mês' : ''}</span></div>
        <div style={{ fontSize: 14, color: 'var(--sand)', margin: '6px 0 12px', lineHeight: 1.4 }}>{im.titulo ? `${im.titulo}` : im.categoria} · <strong style={{ color: 'var(--cream)', fontWeight: 600 }}>{im.bairro}</strong></div>
        <div style={{ display: 'flex', gap: '8px 14px', fontSize: 12.5, color: 'var(--taupe)', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          {im.quartos ? <span>{im.quartos} quartos</span> : null}
          {im.banheiros ? <span>{im.banheiros} banh.</span> : null}
          {im.vagas ? <span>{im.vagas} vagas</span> : null}
          {im.area_m2 ? <span>{im.area_m2} m²</span> : null}
          {im.mobilia ? <span>{MOBILIA_LABELS[im.mobilia]}</span> : null}
        </div>
      </div>
    </Link>
  );
}

const chip = (sel) => ({
  padding: '8px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: sel ? 700 : 400,
  background: sel ? 'rgba(232,168,124,.12)' : 'transparent', color: sel ? 'var(--accent)' : 'var(--cream)',
  border: `1px solid ${sel ? 'var(--accent)' : 'rgba(243,237,227,.2)'}`, cursor: 'pointer'
});
const navLink = {
  background: 'transparent', border: 0, color: 'var(--sand)', fontSize: 14, cursor: 'pointer', padding: 0, fontFamily: 'inherit'
};
const inp = {
  width: '100%', maxWidth: 420, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)',
  borderRadius: 12, padding: '13px 16px', fontSize: 16, color: 'var(--cream)'
};
function Group({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--taupe)' }}>{label}</span>
      {children}
    </div>
  );
}
