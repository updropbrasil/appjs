'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase-browser';
import { ytId, ytThumb, parsePreco, formatPreco, slugify, tituloSeo, MOBILIA_LABELS } from '../../../lib/format';

const CATEGORIAS = ['Apartamento', 'Casa', 'Cobertura', 'Flat / Studio', 'Comercial'];
const BAIRROS = ['Cabo Branco', 'Manaíra', 'Tambaú', 'Bessa', 'Altiplano', 'Intermares'];
const MOBILIAS = [['mobiliado', 'Mobiliado'], ['semi', 'Semimobiliado'], ['sem', 'Sem mobília'], ['planejados', 'Com planejados']];
const STEPS = ['Tipo', 'Localização', 'Características', 'Valores', 'Vídeo e fotos', 'Revisão'];

export default function CadastroClient({ parceiros, imovel, fotosIniciais }) {
  const router = useRouter();
  const supabase = createClient();
  const editando = !!imovel;

  const [step, setStep] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [wide, setWide] = useState(false);
  const [novasFotos, setNovasFotos] = useState([]); // {file, preview}
  const [form, setForm] = useState(() => imovel ? {
    finalidade: imovel.finalidade, categoria: imovel.categoria, titulo: imovel.titulo,
    bairro: imovel.bairro, endereco: imovel.endereco || '', referencia: imovel.referencia || '',
    mobilia: imovel.mobilia, quartos: imovel.quartos || 0, suites: imovel.suites || 0,
    banheiros: imovel.banheiros || 0, vagas: imovel.vagas || 0, area: imovel.area_m2 || '',
    preco: imovel.preco_cents ? String(imovel.preco_cents / 100) : '', condominio: '', iptu: '',
    video: imovel.youtube_url || '', descricao: imovel.descricao || '',
    parceiro_id: imovel.parceiro_id || '', parceiro_pct: imovel.parceiro_pct || ''
  } : {
    finalidade: 'aluguel', categoria: 'Apartamento', titulo: '', bairro: '', endereco: '', referencia: '',
    mobilia: 'sem', quartos: 3, suites: 1, banheiros: 2, vagas: 2, area: '', preco: '', condominio: '', iptu: '',
    video: '', descricao: '', parceiro_id: '', parceiro_pct: ''
  });

  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1000px)');
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const isAluguel = form.finalidade === 'aluguel';
  const seoTitle = tituloSeo({ categoria: form.categoria, quartos: form.quartos, suites: form.suites, mobilia: form.mobilia, finalidade: form.finalidade, bairro: form.bairro });
  const vid = ytId(form.video);

  function addFotos(e) {
    const files = Array.from(e.target.files || []);
    setNovasFotos(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  }

  async function publicar() {
    setSalvando(true); setErro('');
    try {
      const payload = {
        titulo: form.titulo.trim() || seoTitle,
        slug: (imovel?.slug) || `${slugify(form.titulo || seoTitle)}-${Date.now().toString(36)}`,
        finalidade: form.finalidade, categoria: form.categoria, mobilia: form.mobilia,
        bairro: form.bairro || 'João Pessoa', endereco: form.endereco, referencia: form.referencia,
        quartos: Number(form.quartos), suites: Number(form.suites), banheiros: Number(form.banheiros),
        vagas: Number(form.vagas), area_m2: form.area ? Number(String(form.area).replace(/\D/g, '')) : null,
        preco_cents: parsePreco(form.preco), condominio_cents: parsePreco(form.condominio), iptu_cents: parsePreco(form.iptu),
        youtube_url: form.video || null, video_id: vid || null, descricao: form.descricao || null,
        parceiro_id: form.parceiro_id || null, parceiro_pct: form.parceiro_id ? (Number(form.parceiro_pct) || null) : null,
        status: 'ativo'
      };

      let imovelId = imovel?.id;
      if (editando) {
        await supabase.from('imoveis').update(payload).eq('id', imovel.id);
      } else {
        const { data, error } = await supabase.from('imoveis').insert(payload).select('id').single();
        if (error) throw error;
        imovelId = data.id;
      }

      // upload das novas fotos para o bucket 'imoveis-fotos'
      for (let i = 0; i < novasFotos.length; i++) {
        const { file } = novasFotos[i];
        const ext = file.name.split('.').pop();
        const path = `${imovelId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from('imoveis-fotos').upload(path, file, { upsert: true });
        if (upErr) continue;
        const { data: pub } = supabase.storage.from('imoveis-fotos').getPublicUrl(path);
        await supabase.from('imovel_fotos').insert({ imovel_id: imovelId, path, url: pub.publicUrl, ordem: i });
      }

      setStep(6);
      router.refresh();
    } catch (err) {
      setErro('Não foi possível salvar. Verifique os campos e tente novamente.');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  function next() {
    if (step === 5) { publicar(); return; }
    setStep(s => Math.min(6, s + 1));
    window.scrollTo(0, 0);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center', gap: 40, padding: wide ? '0 24px' : 0 }}>
      <div style={{ width: '100%', maxWidth: 480, minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(31,24,18,.95)', backdropFilter: 'blur(8px)', padding: '16px 20px 12px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => step > 0 && step < 6 ? setStep(step - 1) : router.push('/admin')} style={{ width: 40, height: 40, borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', background: 'transparent', color: 'var(--cream)', fontSize: 16 }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <div className="serif" style={{ fontSize: 16, color: 'var(--cream-2)' }}>{editando ? 'Editar imóvel' : 'Novo imóvel'}</div>
              <div style={{ fontSize: 11, color: 'var(--taupe)' }}>{step < 6 ? `Passo ${step + 1} de 6 · ${STEPS[step]}` : 'Concluído'}</div>
            </div>
            <a href="/admin" title="Voltar à gestão" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)' }}>≡</a>
          </div>
          <div style={{ height: 4, background: 'rgba(243,237,227,.1)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Math.min(step, 6) / 6) * 100}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width .3s' }} />
          </div>
        </header>

        <div style={{ flex: 1, padding: '24px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {step === 0 && (
            <>
              <h2 style={{ fontSize: 24, color: 'var(--cream-2)', margin: 0 }}>O imóvel é para alugar ou vender?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['aluguel', 'Alugar', 'Aluguel mensal'], ['venda', 'Vender', 'Venda direta']].map(([k, l, s]) => (
                  <button key={k} onClick={() => set({ finalidade: k })} style={bigOpt(form.finalidade === k)}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: form.finalidade === k ? 'var(--accent)' : 'var(--cream)' }}>{l}</div>
                    <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 4 }}>{s}</div>
                  </button>
                ))}
              </div>
              <Label>Tipo de imóvel</Label>
              <Chips opts={CATEGORIAS.map(c => [c, c])} value={form.categoria} onPick={c => set({ categoria: c })} />
              <Hint>Essa escolha já define os filtros em que o anúncio aparece no site.</Hint>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={h2}>Onde fica?</h2>
              <Field label="Bairro">
                <Chips opts={BAIRROS.map(b => [b, b])} value={form.bairro} onPick={b => set({ bairro: b })} />
              </Field>
              <Field label="Endereço completo — 🔒 NÃO APARECE NO SITE">
                <input value={form.endereco} onChange={e => set({ endereco: e.target.value })} placeholder="Rua, número, complemento…" style={inp} />
                <Hint>Só para seu controle interno — o cliente recebe o endereço no WhatsApp.</Hint>
              </Field>
              <Field label="Ponto de referência (aparece no site)">
                <input value={form.referencia} onChange={e => set({ referencia: e.target.value })} placeholder="Ex.: a 200 m da praia de Tambaú" style={inp} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={h2}>Características</h2>
              {[['quartos', 'Quartos'], ['suites', 'Suítes'], ['banheiros', 'Banheiros'], ['vagas', 'Vagas de garagem']].map(([k, l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
                  <span style={{ fontSize: 15 }}>{l}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => set({ [k]: Math.max(0, form[k] - 1) })} style={counterBtn(false)}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'center', color: 'var(--cream-2)' }}>{form[k]}</span>
                    <button onClick={() => set({ [k]: form[k] + 1 })} style={counterBtn(true)}>+</button>
                  </div>
                </div>
              ))}
              <Field label="Mobília">
                <Chips opts={MOBILIAS} value={form.mobilia} onPick={m => set({ mobilia: m })} />
              </Field>
              <Field label="Área (m²)">
                <input value={form.area} onChange={e => set({ area: e.target.value })} placeholder="Ex.: 148" inputMode="numeric" style={inp} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={h2}>Valores</h2>
              <Field label={isAluguel ? 'Valor do aluguel' : 'Valor de venda'}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.4)', borderRadius: 14, padding: '0 18px' }}>
                  <span style={{ fontSize: 18, color: 'var(--taupe)' }}>R$</span>
                  <input value={form.preco} onChange={e => set({ preco: e.target.value })} placeholder="0" inputMode="numeric" style={{ flex: 1, background: 'transparent', border: 0, padding: '18px 12px', fontSize: 24, fontWeight: 700, color: 'var(--cream-2)', minWidth: 0 }} />
                  {isAluguel && <span style={{ fontSize: 14, color: 'var(--taupe)' }}>/mês</span>}
                </div>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Condomínio"><input value={form.condominio} onChange={e => set({ condominio: e.target.value })} placeholder="R$ (opcional)" inputMode="numeric" style={inp} /></Field>
                <Field label="IPTU"><input value={form.iptu} onChange={e => set({ iptu: e.target.value })} placeholder="R$ (opcional)" inputMode="numeric" style={inp} /></Field>
              </div>
              <div style={{ background: 'rgba(232,168,124,.06)', border: '1px solid rgba(232,168,124,.22)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sand)' }}>Parceria <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· controle interno</span></div>
                <select value={form.parceiro_id} onChange={e => set({ parceiro_id: e.target.value })} style={{ ...inp, appearance: 'auto' }}>
                  <option value="">Sem parceria</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                {form.parceiro_id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--sand)' }}>Comissão:</span>
                    <input value={form.parceiro_pct} onChange={e => set({ parceiro_pct: e.target.value.replace(/\D/g, '') })} style={{ width: 64, textAlign: 'center', ...inp }} />
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>%</span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={h2}>Vídeo e fotos</h2>
              <Field label="Link do tour no YouTube (vídeo ou Shorts)">
                <input value={form.video} onChange={e => set({ video: e.target.value })} placeholder="Cole o link… ex.: youtube.com/shorts/…" style={inp} />
                <Hint>O vídeo vira a capa do anúncio — é a primeira coisa que o cliente vê.</Hint>
              </Field>
              {vid && <div style={{ aspectRatio: '16/9', borderRadius: 14, background: `url("${ytThumb(vid)}") center/cover`, position: 'relative' }}><span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(31,24,18,.8)', fontSize: 11, padding: '4px 9px', borderRadius: 5 }}>✓ Vídeo reconhecido</span></div>}
              <Field label={`Fotos (${fotosIniciais.length + novasFotos.length})`}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {fotosIniciais.map(f => <div key={f.id} style={{ aspectRatio: 1, borderRadius: 12, background: `url("${f.url}") center/cover` }} />)}
                  {novasFotos.map((f, i) => <div key={i} style={{ aspectRatio: 1, borderRadius: 12, background: `url("${f.preview}") center/cover` }} />)}
                  <label style={{ position: 'relative', aspectRatio: 1, borderRadius: 12, border: '2px dashed rgba(243,237,227,.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--taupe)', cursor: 'pointer' }}>
                    <input type="file" accept="image/*" multiple onChange={addFotos} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <span style={{ fontSize: 24 }}>+</span><span style={{ fontSize: 11.5 }}>Adicionar</span>
                  </label>
                </div>
                <Hint>Direto da galeria do celular. Enviadas para o Storage ao publicar.</Hint>
              </Field>
              <Field label="Descrição (opcional)">
                <textarea value={form.descricao} onChange={e => set({ descricao: e.target.value })} rows={4} placeholder="Detalhes do imóvel…" style={{ ...inp, resize: 'vertical' }} />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <h2 style={h2}>Título e revisão</h2>
              <Field label="Título do anúncio">
                <div style={{ background: 'rgba(232,168,124,.07)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--accent)' }}>🔎 SUGESTÃO OTIMIZADA PARA O GOOGLE</div>
                  <div style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.45 }}>{seoTitle}</div>
                  <button onClick={() => set({ titulo: seoTitle })} style={{ alignSelf: 'flex-start', background: 'var(--accent)', color: '#2A2117', padding: '9px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, border: 0 }}>Usar esta sugestão</button>
                </div>
                <input value={form.titulo} onChange={e => set({ titulo: e.target.value })} placeholder="Ou escreva o seu…" style={inp} />
                <Hint>A sugestão é montada a partir das infos que você preencheu. Pode usá-la ou ajustar.</Hint>
              </Field>
              <div style={{ fontSize: 13, color: 'var(--taupe)' }}>É assim que o anúncio aparece no site:</div>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '16/10', background: vid ? `url("${ytThumb(vid)}") center/cover` : (novasFotos[0] ? `url("${novasFotos[0].preview}") center/cover` : '#463928'), position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(31,24,18,.85)', color: isAluguel ? 'var(--accent)' : 'var(--green)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '5px 10px', borderRadius: 6 }}>{isAluguel ? 'ALUGUEL' : 'VENDA'}</span>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--cream-2)' }}>{form.preco ? formatPreco(parsePreco(form.preco)) : 'R$ —'}<span style={{ fontSize: 12.5, color: 'var(--taupe)' }}>{isAluguel ? '/mês' : ''}</span></div>
                  <div style={{ fontSize: 13.5, color: 'var(--sand)', margin: '5px 0 10px' }}>{form.titulo || seoTitle} · {form.bairro || 'João Pessoa'}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span>{form.quartos} quartos</span><span>{form.banheiros} banh.</span><span>{form.vagas} vagas</span><span>{form.area || '—'} m²</span><span>{MOBILIA_LABELS[form.mobilia]}</span>
                  </div>
                </div>
              </div>
              {erro && <div style={{ color: '#e88a7a', fontSize: 13 }}>{erro}</div>}
            </>
          )}

          {step === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 60, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(168,192,143,.15)', border: '1px solid rgba(168,192,143,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: 'var(--green)' }}>✓</div>
              <h2 style={{ ...h2, fontSize: 26 }}>{editando ? 'Alterações salvas!' : 'Anúncio publicado!'}</h2>
              <p style={{ fontSize: 14, color: 'var(--taupe)', maxWidth: 280, lineHeight: 1.55 }}>{form.titulo || seoTitle} já está no ar em {form.bairro || 'João Pessoa'}.</p>
              <a href="/admin/novo" style={{ marginTop: 12, background: 'var(--accent)', color: '#2A2117', padding: '15px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Cadastrar outro imóvel</a>
              <a href="/admin" style={{ padding: '13px 28px', borderRadius: 12, border: '1px solid rgba(243,237,227,.25)', color: 'var(--cream)', fontSize: 14, fontWeight: 600 }}>Ver meus imóveis</a>
            </div>
          )}
        </div>

        {step < 6 && (
          <div style={{ position: 'sticky', bottom: 0, padding: '14px 20px 20px', background: 'linear-gradient(to top,var(--bg) 65%,transparent)' }}>
            <button onClick={next} disabled={salvando} style={{ width: '100%', height: 54, borderRadius: 14, background: 'var(--accent)', color: '#2A2117', fontSize: 16, fontWeight: 700, border: 0 }}>
              {salvando ? 'Salvando…' : step === 5 ? (editando ? 'Salvar alterações' : 'Publicar imóvel') : 'Continuar'}
            </button>
          </div>
        )}
      </div>

      {wide && step < 6 && (
        <div style={{ width: 320, flex: 'none', position: 'sticky', top: 0, alignSelf: 'flex-start', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--taupe)', fontWeight: 700 }}>PRÉVIA NO SITE</div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '9/16', background: vid ? `url("${ytThumb(vid)}") center/cover` : (novasFotos[0] ? `url("${novasFotos[0].preview}") center/cover` : '#463928') }}>
              <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(31,24,18,.85)', color: isAluguel ? 'var(--accent)' : 'var(--green)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', padding: '5px 10px', borderRadius: 6 }}>{isAluguel ? 'ALUGUEL' : 'VENDA'}</span>
              {vid && <span style={{ position: 'absolute', bottom: 12, left: 12, width: 30, height: 30, borderRadius: 999, background: 'rgba(243,237,227,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A2117', fontSize: 12 }}>▶</span>}
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream-2)' }}>{form.preco ? formatPreco(parsePreco(form.preco)) : 'R$ —'}<span style={{ fontSize: 12, color: 'var(--taupe)' }}>{isAluguel ? '/mês' : ''}</span></div>
              <div style={{ fontSize: 12.5, color: 'var(--sand)', margin: '4px 0 9px' }}>{form.titulo || seoTitle} · {form.bairro || 'João Pessoa'}</div>
              <div style={{ display: 'flex', gap: '8px 11px', fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span>{form.quartos} quartos</span><span>{form.banheiros} banh.</span><span>{form.vagas} vagas</span><span>{form.area || '—'} m²</span><span>{MOBILIA_LABELS[form.mobilia]}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Atualiza em tempo real conforme você preenche.</div>
        </div>
      )}
    </div>
  );
}

const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 12, padding: '15px 16px', fontSize: 16, color: 'var(--cream)' };
const h2 = { fontSize: 24, color: 'var(--cream-2)', margin: 0 };
const bigOpt = (sel) => ({ padding: '22px 16px', borderRadius: 14, border: `2px solid ${sel ? 'var(--accent)' : 'rgba(243,237,227,.15)'}`, background: sel ? 'rgba(232,168,124,.1)' : 'var(--bg-2)', textAlign: 'center', cursor: 'pointer' });
const counterBtn = (filled) => ({ width: 44, height: 44, borderRadius: 999, border: filled ? 0 : '1px solid rgba(243,237,227,.2)', background: filled ? 'var(--accent)' : 'transparent', color: filled ? '#2A2117' : 'var(--sand)', fontSize: 20 });

function Label({ children }) { return <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sand)', marginTop: 6 }}>{children}</div>; }
function Hint({ children }) { return <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{children}</span>; }
function Field({ label, children }) { return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sand)' }}>{label}</span>{children}</div>; }
function Chips({ opts, value, onPick }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{opts.map(([k, l]) => (
    <button key={k} onClick={() => onPick(k)} style={{ padding: '12px 18px', borderRadius: 999, fontSize: 14, fontWeight: value === k ? 700 : 400, border: `1px solid ${value === k ? 'var(--accent)' : 'rgba(243,237,227,.2)'}`, background: value === k ? 'rgba(232,168,124,.12)' : 'transparent', color: value === k ? 'var(--accent)' : 'var(--sand)' }}>{l}</button>
  ))}</div>;
}
