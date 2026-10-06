'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ytId, ytEmbed, maskThousands, whatsappLink } from '../lib/format';
import { trackWhatsApp } from '../lib/track';
import { semAcento, soLetrasNumeros, FILTROS_PADRAO, filtrosDaUrl, urlDosFiltros, lembrarBusca, lembrarRolagem, pegarRolagem } from '../lib/busca';
import CardImovel from './CardImovel';
import IconeWhats from './IconeWhats';

const QUARTOS = ['1', '2', '3', '4'];
const ORDENS = [
  { k: 'relevancia', label: 'Destaques' }, { k: 'menor', label: 'Menor preço' },
  { k: 'maior', label: 'Maior preço' }, { k: 'recentes', label: 'Mais recentes' }
];
const CATEGORIAS = ['Apartamento', 'Casa', 'Cobertura', 'Flat / Studio'];
const MOBILIAS = [
  { k: 'todos', label: 'Todas' }, { k: 'mobiliado', label: 'Mobiliado' },
  { k: 'semi', label: 'Semimobiliado' }, { k: 'sem', label: 'Sem mobília' },
  { k: 'planejados', label: 'Com planejados' }
];

export default function PortalClient({ imoveis, heroVideo, heroVideoFile }) {
  // Todos os filtros num objeto só, espelhado no link (?f=aluguel&q=manaira...).
  // Assim a busca pode ser compartilhada e continua igual quando a pessoa volta de um imóvel.
  const [fl, setFl] = useState(FILTROS_PADRAO);
  const [pronto, setPronto] = useState(false);
  const set = (k) => (v) => setFl(o => ({ ...o, [k]: v }));
  const filter = fl.f, setFilter = set('f');
  const fBairro = fl.q, setFBairro = set('q');
  const fTipo = fl.tipo, setFTipo = set('tipo');
  const fMin = fl.min, setFMin = (v) => set('min')(String(v).replace(/\D/g, ''));
  const fMax = fl.max, setFMax = (v) => set('max')(String(v).replace(/\D/g, ''));
  const fMobilia = fl.mob, setFMobilia = set('mob');
  const fQuartos = fl.quartos, setFQuartos = set('quartos');
  const ordem = fl.ordem, setOrdem = set('ordem');
  const [showFilters, setShowFilters] = useState(false);
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const on = () => setIsMobile(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // 1) ao abrir: lê os filtros do link e, se a pessoa está voltando de um imóvel, volta para o mesmo ponto da lista
  useEffect(() => {
    const inicial = filtrosDaUrl(window.location.search);
    setFl(inicial);
    setPronto(true);
    const query = urlDosFiltros(inicial);
    const y = pegarRolagem(query);
    const irPara = (fn) => requestAnimationFrame(() => setTimeout(fn, 60));
    if (y != null) irPara(() => window.scrollTo(0, y));
    else if (window.location.hash === '#lista' || query) irPara(() => {
      const el = document.getElementById('lista');
      if (el) window.scrollTo(0, el.offsetTop - 70);
    });
  }, []);

  // 2) a cada mudança: atualiza o link (sem recarregar) e guarda a busca para o "Voltar aos imóveis"
  const query = urlDosFiltros(fl);
  useEffect(() => {
    if (!pronto) return;
    try { window.history.replaceState(window.history.state, '', window.location.pathname + query); } catch (e) {}
    lembrarBusca(query);
  }, [pronto, query]);

  const heroYt = ytId(heroVideo);
  const wa = whatsappLink('Olá! Vi um imóvel no site e tenho interesse.');
  const goToList = (f) => {
    setFilter(f);
    const el = document.getElementById('lista');
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  };

  const num = (v) => { const n = String(v).replace(/\D/g, ''); return n ? Number(n) : null; };
  const pMin = num(fMin), pMax = num(fMax), nQuartos = num(fQuartos);
  // busca sem acento ("manaira" acha "Manaíra"); no mesmo campo aceita código: jdv-1019, jdv1019 ou só 1019
  const bairroQ = semAcento(fBairro);
  const codQ = soLetrasNumeros(fBairro);
  const matchImovel = (i) => {
    if (!bairroQ) return true;
    if (semAcento(i.bairro).includes(bairroQ)) return true;
    if (semAcento(i.titulo).includes(bairroQ)) return true;
    return !!codQ && soLetrasNumeros(i.codigo).includes(codQ);
  };

  // bairros que existem nos imóveis ativos, do que tem mais imóveis para o que tem menos
  const bairros = useMemo(() => {
    // agrupa grafias diferentes do mesmo bairro ("Camboinha" e "CAMBOINHA") e mostra a que não está toda em maiúsculas
    const grupos = {};
    imoveis.forEach(i => {
      const b = (i.bairro || '').trim(); if (!b) return;
      const k = semAcento(b);
      const g = grupos[k] || (grupos[k] = { nome: b, n: 0 });
      g.n += 1;
      if (g.nome === g.nome.toUpperCase() && b !== b.toUpperCase()) g.nome = b;
    });
    const titulo = (t) => t === t.toUpperCase() ? t.toLowerCase().replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase()) : t;
    return Object.values(grupos).sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome)).map(g => titulo(g.nome));
  }, [imoveis]);

  const lista = useMemo(() => {
    const r = imoveis
      .filter(i => filter === 'todos' || i.finalidade === filter)
      .filter(matchImovel)
      .filter(i => fTipo === 'todos' || i.categoria === fTipo)
      .filter(i => pMin == null || i.preco_cents >= pMin * 100)
      .filter(i => pMax == null || i.preco_cents <= pMax * 100)
      .filter(i => fMobilia === 'todos' || i.mobilia === fMobilia)
      .filter(i => nQuartos == null || (i.quartos || 0) >= nQuartos);
    if (ordem === 'menor') r.sort((a, b) => (a.preco_cents || 0) - (b.preco_cents || 0));
    else if (ordem === 'maior') r.sort((a, b) => (b.preco_cents || 0) - (a.preco_cents || 0));
    else if (ordem === 'recentes') r.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return r;
  }, [imoveis, filter, bairroQ, codQ, fTipo, pMin, pMax, fMobilia, nQuartos, ordem]);

  const activeCount = [fTipo !== 'todos', fMobilia !== 'todos', !!bairroQ, pMin != null, pMax != null, nQuartos != null].filter(Boolean).length;
  const limparFiltros = () => setFl(o => ({ ...FILTROS_PADRAO, f: o.f, ordem: o.ordem }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(31,24,18,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
        <div className="container cab-home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo-jason-dias.jpg" alt="Jason Dias Imóveis" style={{ height: isMobile ? 30 : 36, width: 'auto', mixBlendMode: 'screen' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 28 }}>
            {/* escondido no celular pelo CSS (classe so-pc), para já abrir certo antes do JavaScript carregar */}
            <nav className="so-pc" style={{ display: 'flex', gap: 26, fontSize: 14, color: 'var(--sand)' }}>
              <button onClick={() => goToList('aluguel')} style={navLink}>Alugar</button>
              <button onClick={() => goToList('venda')} style={navLink}>Comprar</button>
              <button onClick={() => goToList('todos')} style={navLink}>Imóveis</button>
            </nav>
            <a href={wa} target="_blank" rel="noopener" onClick={() => trackWhatsApp({})} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--wa)', color: 'var(--wa-texto)', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
              <IconeWhats size={16} />WhatsApp
            </a>
            <Link href="/admin/login" title="Área do corretor" aria-label="Área do corretor"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(243,237,227,.14)', color: '#7a6c59', flex: 'none' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: isMobile ? 'auto' : 'min(94vh, 800px)', background: heroYt ? `#2A2117 url("https://i.ytimg.com/vi/${heroYt}/hqdefault.jpg") center/cover` : 'linear-gradient(200deg,#4A3B2A,#2A2117 60%,#1F1812)', overflow: 'hidden', display: 'flex' }}>
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
            <div style={{ maxWidth: 620, paddingTop: isMobile ? 70 : 90 }}>
              <div style={{ display: 'inline-flex', gap: 8, fontSize: 10.5, letterSpacing: '.2em', color: 'var(--accent)', border: '1px solid rgba(232,168,124,.4)', padding: '6px 12px', borderRadius: 999, marginBottom: 18 }}>JOÃO PESSOA · PB</div>
              <h1 style={{ fontSize: 'clamp(26px, 4vw, 48px)', lineHeight: 1.14, color: 'var(--cream-2)', margin: 0, textShadow: '0 2px 24px rgba(0,0,0,.45)' }}>Morar bem em João Pessoa começa com um bom tour</h1>
              <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: 'var(--cream)', marginTop: 14, maxWidth: 460, lineHeight: 1.55, textShadow: '0 1px 12px rgba(0,0,0,.5)' }}>Todos os nossos imóveis têm tour guiado em vídeo. Conheça por dentro antes de agendar a visita.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => goToList('aluguel')} style={{ background: 'var(--accent)', color: '#2A2117', padding: '13px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 0, cursor: 'pointer' }}>Ver imóveis para alugar</button>
                <button onClick={() => goToList('venda')} style={{ border: '1px solid rgba(243,237,227,.5)', background: 'rgba(31,24,18,.25)', color: 'var(--cream)', padding: '13px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>À venda</button>
                {!heroVideoFile && heroYt && <button onClick={() => setHeroPlaying(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, color: 'var(--cream)', fontSize: 13, cursor: 'pointer', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, background: 'rgba(31,24,18,.5)', border: '1px solid rgba(243,237,227,.4)' }}>▶</span> Assistir com som</button>}
              </div>
            </div>

            {/* BUSCA — sempre visível sobre o vídeo */}
            <div style={{ marginTop: 26, background: 'rgba(31,24,18,.78)', backdropFilter: 'blur(10px)', border: '1px solid rgba(243,237,227,.14)', borderRadius: 16, padding: isMobile ? 14 : '18px 20px', maxWidth: 940, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 18px 50px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', gap: isMobile ? 10 : 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 190px', minWidth: 0 }}>
                  <div style={buscaLabel}>QUERO</div>
                  <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 11, padding: 3, border: '1px solid rgba(243,237,227,.12)' }}>
                    {[['aluguel', 'Alugar'], ['venda', 'Comprar'], ['todos', 'Tudo']].map(([k, l]) => (
                      <button key={k} onClick={() => setFilter(k)} style={{ flex: 1, padding: '11px 6px', borderRadius: 9, border: 0, fontSize: 13.5, fontWeight: filter === k ? 700 : 500, background: filter === k ? 'var(--accent)' : 'transparent', color: filter === k ? '#2A2117' : 'var(--sand)', cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={buscaLabel}>BAIRRO OU CÓDIGO</div>
                  <input value={fBairro} onChange={e => setFBairro(e.target.value)} list="jd-bairros" placeholder={isMobile ? 'Bairro ou JDV1019' : 'ex.: Cabo Branco ou JDV1019'} style={buscaField} enterKeyHint="search" onKeyDown={e => { if (e.key === 'Enter') goToList(filter); }} />
                  <datalist id="jd-bairros">{bairros.map(b => <option key={b} value={b} />)}</datalist>
                </div>

                <div style={{ flex: isMobile ? '1 1 130px' : '1 1 200px', minWidth: 0 }}>
                  <div style={buscaLabel}>TIPO DE IMÓVEL</div>
                  <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={buscaField}>
                    <option value="todos">Todos os tipos</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ flex: isMobile ? '1 1 100px' : '1 1 120px', minWidth: 0 }}>
                  <div style={buscaLabel}>QUARTOS</div>
                  <select value={fQuartos} onChange={e => setFQuartos(e.target.value)} style={buscaField}>
                    <option value="">Qualquer</option>
                    {QUARTOS.map(q => <option key={q} value={q}>{q}+ quarto{q === '1' ? '' : 's'}</option>)}
                  </select>
                </div>

                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={buscaLabel}>FAIXA DE VALOR</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ ...buscaField, display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, padding: '0 12px' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>R$</span>
                      <input value={maskThousands(fMin)} onChange={e => setFMin(e.target.value)} placeholder="mín." inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 15, color: 'var(--cream)' }} />
                    </div>
                    <div style={{ ...buscaField, display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, padding: '0 12px' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>R$</span>
                      <input value={maskThousands(fMax)} onChange={e => setFMax(e.target.value)} placeholder="máx." inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 15, color: 'var(--cream)' }} />
                    </div>
                  </div>
                </div>

                <button onClick={() => goToList(filter)} style={{ flex: isMobile ? '1 1 100%' : '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent)', color: '#2A2117', border: 0, borderRadius: 11, padding: '15px 24px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                  Ver {lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                <span>Bairros:</span>
                {bairros.slice(0, isMobile ? 4 : 7).map(b => {
                  const sel = semAcento(fBairro) === semAcento(b);
                  return (
                    <button key={b} onClick={() => { setFBairro(sel ? '' : b); goToList(filter); }}
                      style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${sel ? 'var(--accent)' : 'rgba(243,237,227,.18)'}`, background: sel ? 'rgba(232,168,124,.14)' : 'transparent', color: sel ? 'var(--accent)' : 'var(--sand)' }}>{b}</button>
                  );
                })}
                <button onClick={() => { setShowFilters(true); goToList(filter); }} style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>mais filtros →</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* LISTA */}
      <section id="lista" className="container" style={{ padding: isMobile ? '28px 20px 40px' : '36px 56px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
          <h2 style={{ fontSize: 24, color: 'var(--cream-2)', margin: 0 }}>Imóveis disponíveis <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'Karla, system-ui, sans-serif' }}>({lista.length})</span></h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={ordem} onChange={e => setOrdem(e.target.value)} aria-label="Ordenar"
              style={{ ...chip(ordem !== 'relevancia'), appearance: 'none', paddingRight: 28, background: `${ordem !== 'relevancia' ? 'rgba(232,168,124,.12)' : 'transparent'} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23D8C9B2'/%3E%3C/svg%3E") no-repeat right 11px center` }}>
              {ORDENS.map(o => <option key={o.k} value={o.k} style={{ color: '#2A2117' }}>{o.k === 'relevancia' ? 'Ordenar: destaques' : o.label}</option>)}
            </select>
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
            <Group label="BAIRRO OU CÓDIGO">
              <input value={fBairro} onChange={e => setFBairro(e.target.value)} placeholder="Bairro ou código… ex.: Cabo Branco, JDV1019" style={inp} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
                {bairros.map(b => { const sel = semAcento(fBairro) === semAcento(b); return <button key={b} onClick={() => setFBairro(sel ? '' : b)} style={chip(sel)}>{b}</button>; })}
              </div>
            </Group>
            <Group label="FAIXA DE VALOR">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '0 14px', flex: '1 1 130px', maxWidth: 200 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>R$</span>
                  <input value={maskThousands(fMin)} onChange={e => setFMin(e.target.value)} placeholder="mínimo" inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 16, color: 'var(--cream)' }} />
                </div>
                <span style={{ color: 'var(--muted)' }}>até</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '0 14px', flex: '1 1 130px', maxWidth: 200 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>R$</span>
                  <input value={maskThousands(fMax)} onChange={e => setFMax(e.target.value)} placeholder="máximo" inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '13px 0', fontSize: 16, color: 'var(--cream)' }} />
                </div>
              </div>
            </Group>
            <Group label="QUARTOS">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => setFQuartos('')} style={chip(!fQuartos)}>Qualquer</button>
                {QUARTOS.map(q => <button key={q} onClick={() => setFQuartos(q)} style={chip(fQuartos === q)}>{q}+</button>)}
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
              {activeCount > 0 && <button onClick={limparFiltros} style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>Limpar filtros</button>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill,minmax(210px,1fr))', gap: isMobile ? 12 : 20 }}>
          {lista.map((im, i) => <CardImovel key={im.id} im={im} compacto={isMobile} autoVideo={!isMobile} origin={origin} priority={i < 4} onAbrir={() => lembrarRolagem(query)} />)}
        </div>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
            Nenhum imóvel encontrado com esses filtros.
            {activeCount > 0 && <div><button onClick={limparFiltros} style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 999, padding: '8px 16px', fontSize: 13 }}>Limpar filtros</button></div>}
          </div>
        )}
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-jason-dias.jpg" alt="Jason Dias Imóveis" style={{ height: 24, width: 'auto', mixBlendMode: 'screen' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em' }}>CRECI 8085</span>
        </span>
        <span>João Pessoa · PB — Aluguel e venda de médio-alto padrão</span>
        <Link href="/admin/login" style={{ fontSize: 11.5, color: '#6b5f4e' }}>Área do corretor</Link>
      </footer>
    </div>
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
const buscaLabel = { fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: 'var(--taupe)', marginBottom: 6 };
const buscaField = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid rgba(243,237,227,.12)', borderRadius: 11, padding: '13px 12px', fontSize: 15, color: 'var(--cream)', appearance: 'none' };
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
