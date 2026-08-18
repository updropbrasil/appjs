// Aparece na hora em que você clica, enquanto os dados carregam —
// sem isso a tela fica congelada na página anterior.
export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 820, minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 999, border: '1px solid rgba(243,237,227,.1)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 130, height: 15, borderRadius: 5, background: 'rgba(243,237,227,.09)' }} />
            <div style={{ width: 90, height: 10, borderRadius: 4, background: 'rgba(243,237,227,.06)', marginTop: 6 }} />
          </div>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 62, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', opacity: 1 - i * 0.13 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
