'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addLocation, updateLocation, deleteLocation, addConnection, updateConnection, deleteConnection, addDungeon, updateDungeon, deleteDungeon } from '@/app/actions/locations'

const DUNGEON_TYPE_LABELS = { dungeon: '던전', field_boss: '필드보스' }

function SearchSelect({ selectedLabel, onSelect, options, placeholder = '검색...', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) { setEditing(false); setQuery('') } }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filtered = (query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options
  ).slice(0, 12)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        value={editing ? query : (selectedLabel ?? '')}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setEditing(true); setQuery('') }}
        onKeyDown={e => e.key === 'Escape' && (setEditing(false), setQuery(''))}
        placeholder={placeholder}
        className="input-field w-full rounded px-3 py-2 text-sm"
      />
      {editing && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
          {filtered.map(opt => (
            <li key={opt.value}>
              <button type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(opt); setEditing(false); setQuery('') }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}>
                {opt.emoji && <span>{opt.emoji}</span>}
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>검색 결과 없음</li>
          )}
        </ul>
      )}
    </div>
  )
}

function LocationModal({ location, onClose, onSave }) {
  const [form, setForm] = useState({
    name: location?.name ?? '',
    description: location?.description ?? '',
    region: location?.region ?? '',
    emoji: location?.emoji ?? '📍',
    sort_order: location?.sort_order ?? 0,
  })
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('지역명을 입력해주세요')
    setError(null)
    startTransition(async () => {
      const result = location ? await updateLocation(location.id, form) : await addLocation(form)
      if (result.error) setError(result.error)
      else onSave(result.location)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>
            ✦ {location ? '지역 수정' : '지역 추가'}
          </h3>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60" style={{ color: 'var(--ink)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm rounded px-3 py-2"
              style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>{error}</p>
          )}
          <div className="grid grid-cols-[3rem_1fr] gap-2">
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>아이콘</label>
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4}
                className="input-field w-full rounded px-2 py-2 text-center text-lg" />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>지역명 *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 티르 코네일"
                className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>지역 구분</label>
            <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="예: 에린, 이리아"
              className="input-field w-full rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="input-field w-full rounded px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>정렬 순서</label>
            <input type="number" value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="input-field w-24 rounded px-3 py-2 text-sm" />
          </div>
        </form>
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
          <button type="button" onClick={onClose} className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 py-2 rounded text-sm">
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DungeonModal({ dungeon, locations, onClose, onSave }) {
  const [form, setForm] = useState({
    name: dungeon?.name ?? '',
    emoji: dungeon?.emoji ?? '🏰',
    location_id: dungeon?.location?.id ?? '',
    dungeon_type: dungeon?.dungeon_type ?? 'dungeon',
    description: dungeon?.description ?? '',
    sort_order: dungeon?.sort_order ?? 0,
  })
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const locOptions = [
    { value: '', label: '위치 미지정' },
    ...locations.map(l => ({ value: l.id, label: l.name, emoji: l.emoji })),
  ]
  const selectedLoc = locations.find(l => l.id === form.location_id)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('이름을 입력해주세요')
    setError(null)
    startTransition(async () => {
      const result = dungeon ? await updateDungeon(dungeon.id, form) : await addDungeon(form)
      if (result.error) setError(result.error)
      else onSave(result.dungeon)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>
            ✦ {dungeon ? '수정' : '던전/필드보스 추가'}
          </h3>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60" style={{ color: 'var(--ink)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm rounded px-3 py-2"
              style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>{error}</p>
          )}
          <div className="grid grid-cols-[3rem_1fr] gap-2">
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>아이콘</label>
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4}
                className="input-field w-full rounded px-2 py-2 text-center text-lg" />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>이름 *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--ink)' }}>종류</label>
            <div className="flex gap-4">
              {[['dungeon', '던전'], ['field_boss', '필드보스']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={form.dungeon_type === v} onChange={() => set('dungeon_type', v)}
                    style={{ accentColor: 'var(--sage)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{l}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>입장 위치</label>
            <SearchSelect
              selectedLabel={selectedLoc ? `${selectedLoc.emoji} ${selectedLoc.name}` : '위치 미지정'}
              onSelect={opt => set('location_id', opt.value)}
              options={locOptions}
              placeholder="위치 검색..."
            />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="input-field w-full rounded px-3 py-2 text-sm resize-none" />
          </div>
        </form>
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
          <button type="button" onClick={onClose} className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 py-2 rounded text-sm">
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LocationsSection({ locations, setLocations }) {
  const [modal, setModal] = useState(null)
  const [, startTransition] = useTransition()

  function handleSave(location) {
    setLocations(prev => {
      const idx = prev.findIndex(l => l.id === location.id)
      return idx >= 0 ? prev.map(l => l.id === location.id ? location : l) : [...prev, location]
    })
    setModal(null)
  }

  function handleDelete(location) {
    if (!confirm(`'${location.name}' 지역을 삭제할까요?`)) return
    startTransition(async () => {
      const result = await deleteLocation(location.id)
      if (!result.error) setLocations(prev => prev.filter(l => l.id !== location.id))
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>{locations.length}개 지역</span>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ 지역 추가</button>
      </div>
      <div className="flex-1 overflow-y-auto dots-bg">
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--parchment-dark)' }}>
            <tr>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>지역</th>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>구분</th>
              <th className="px-4 py-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc, idx) => (
              <tr key={loc.id}
                style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(138,106,31,0.04)', borderBottom: '1px solid rgba(138,106,31,0.12)' }}>
                <td className="px-4 py-2.5">
                  <span className="mr-2">{loc.emoji}</span>
                  <span style={{ color: 'var(--ink)' }}>{loc.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>{loc.region || '-'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(loc)} className="btn-ghost-sm px-2 py-1 rounded text-xs">수정</button>
                    <button onClick={() => handleDelete(loc)} className="btn-danger text-xs px-2 py-1 rounded">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>등록된 지역이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <LocationModal
          location={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function ConnectionsSection({ connections, setConnections, locations }) {
  const [form, setForm] = useState({ location_a_id: '', location_b_id: '', travel_time: 1 })
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTime, setEditTime] = useState(1)
  const [, startTransition] = useTransition()

  const locOptions = locations.map(l => ({ value: l.id, label: l.name, emoji: l.emoji }))
  const locA = locations.find(l => l.id === form.location_a_id)
  const locB = locations.find(l => l.id === form.location_b_id)

  function handleAdd(e) {
    e.preventDefault()
    if (!form.location_a_id || !form.location_b_id) return setError('두 지역을 모두 선택해주세요')
    if (form.location_a_id === form.location_b_id) return setError('서로 다른 지역을 선택해주세요')
    setError(null)
    startTransition(async () => {
      const result = await addConnection(form)
      if (result.error) return setError(result.error)
      setConnections(prev => [...prev, result.connection])
      setForm({ location_a_id: '', location_b_id: '', travel_time: 1 })
    })
  }

  function handleUpdateTime(id) {
    startTransition(async () => {
      const result = await updateConnection(id, editTime)
      if (!result.error) {
        setConnections(prev => prev.map(c => c.id === id ? result.connection : c))
        setEditingId(null)
      }
    })
  }

  function handleDelete(id) {
    if (!confirm('이 연결을 삭제할까요?')) return
    startTransition(async () => {
      const result = await deleteConnection(id)
      if (!result.error) setConnections(prev => prev.filter(c => c.id !== id))
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)', backgroundColor: 'var(--parchment-dark)' }}>
        <p className="font-serif text-xs font-semibold mb-3" style={{ color: 'var(--gold-dark)' }}>✦ 연결 추가</p>
        {error && <p className="text-xs mb-2" style={{ color: 'var(--crimson-light)' }}>{error}</p>}
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--ink)' }}>지역 A</label>
            <SearchSelect
              selectedLabel={locA ? `${locA.emoji} ${locA.name}` : ''}
              onSelect={opt => setForm(p => ({ ...p, location_a_id: opt.value }))}
              options={locOptions} placeholder="선택..."
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--ink)' }}>지역 B</label>
            <SearchSelect
              selectedLabel={locB ? `${locB.emoji} ${locB.name}` : ''}
              onSelect={opt => setForm(p => ({ ...p, location_b_id: opt.value }))}
              options={locOptions} placeholder="선택..."
            />
          </div>
          <div className="w-20">
            <label className="block text-xs mb-1" style={{ color: 'var(--ink)' }}>이동 시간(분)</label>
            <input type="number" value={form.travel_time} min={1}
              onChange={e => setForm(p => ({ ...p, travel_time: parseInt(e.target.value) || 1 }))}
              onFocus={e => e.target.select()}
              className="input-field w-full rounded px-2 py-2 text-sm text-center" />
          </div>
          <button onClick={handleAdd} className="btn-primary px-3 py-2 rounded text-sm flex-shrink-0">추가</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto dots-bg">
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--parchment-dark)' }}>
            <tr>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>연결</th>
              <th className="text-center px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>이동시간</th>
              <th className="px-4 py-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn, idx) => (
              <tr key={conn.id}
                style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(138,106,31,0.04)', borderBottom: '1px solid rgba(138,106,31,0.12)' }}>
                <td className="px-4 py-2.5" style={{ color: 'var(--ink)' }}>
                  <span>{conn.location_a?.emoji} {conn.location_a?.name}</span>
                  <span className="mx-2" style={{ opacity: 0.4 }}>↔</span>
                  <span>{conn.location_b?.emoji} {conn.location_b?.name}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {editingId === conn.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input type="number" value={editTime} min={1}
                        onChange={e => setEditTime(parseInt(e.target.value) || 1)}
                        onFocus={e => e.target.select()}
                        className="input-field w-16 rounded px-2 py-1 text-xs text-center" />
                      <button onClick={() => handleUpdateTime(conn.id)} className="btn-primary text-xs px-2 py-1 rounded">✓</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost-sm text-xs px-1 py-1 rounded">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(conn.id); setEditTime(conn.travel_time) }}
                      className="text-xs hover:opacity-70" style={{ color: 'var(--ink)' }}>
                      {conn.travel_time}분
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => handleDelete(conn.id)}
                    className="btn-danger text-xs px-2 py-1 rounded float-right">삭제</button>
                </td>
              </tr>
            ))}
            {connections.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>등록된 연결이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DungeonsSection({ dungeons, setDungeons, locations }) {
  const [modal, setModal] = useState(null)
  const [, startTransition] = useTransition()

  function handleSave(dungeon) {
    setDungeons(prev => {
      const idx = prev.findIndex(d => d.id === dungeon.id)
      return idx >= 0 ? prev.map(d => d.id === dungeon.id ? dungeon : d) : [...prev, dungeon]
    })
    setModal(null)
  }

  function handleDelete(dungeon) {
    if (!confirm(`'${dungeon.name}'을(를) 삭제할까요?`)) return
    startTransition(async () => {
      const result = await deleteDungeon(dungeon.id)
      if (!result.error) setDungeons(prev => prev.filter(d => d.id !== dungeon.id))
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>{dungeons.length}개</span>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ 추가</button>
      </div>
      <div className="flex-1 overflow-y-auto dots-bg">
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--parchment-dark)' }}>
            <tr>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>이름</th>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>종류</th>
              <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>입장 위치</th>
              <th className="px-4 py-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {dungeons.map((d, idx) => (
              <tr key={d.id}
                style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(138,106,31,0.04)', borderBottom: '1px solid rgba(138,106,31,0.12)' }}>
                <td className="px-4 py-2.5">
                  <span className="mr-2">{d.emoji}</span>
                  <span style={{ color: 'var(--ink)' }}>{d.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>
                  {DUNGEON_TYPE_LABELS[d.dungeon_type] ?? d.dungeon_type}
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>
                  {d.location ? `${d.location.emoji} ${d.location.name}` : '-'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(d)} className="btn-ghost-sm px-2 py-1 rounded text-xs">수정</button>
                    <button onClick={() => handleDelete(d)} className="btn-danger text-xs px-2 py-1 rounded">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
            {dungeons.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>등록된 던전/필드보스가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <DungeonModal
          dungeon={modal === 'add' ? null : modal}
          locations={locations}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

const SECTIONS = [
  { id: 'locations', label: '지역' },
  { id: 'connections', label: '연결' },
  { id: 'dungeons', label: '던전/필드보스' },
]

export default function LocationsTab({ locations, setLocations, connections, setConnections, dungeons, setDungeons }) {
  const [activeSection, setActiveSection] = useState('locations')

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="flex px-2 pt-2 gap-1 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="px-4 py-2 text-sm rounded-t transition-colors"
            style={{
              color: activeSection === s.id ? 'var(--gold-dark)' : 'var(--ink)',
              backgroundColor: activeSection === s.id ? 'rgba(201,168,76,0.1)' : 'transparent',
              borderBottom: `2px solid ${activeSection === s.id ? 'var(--gold)' : 'transparent'}`,
              fontWeight: activeSection === s.id ? 600 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeSection === 'locations' && <LocationsSection locations={locations} setLocations={setLocations} />}
        {activeSection === 'connections' && <ConnectionsSection connections={connections} setConnections={setConnections} locations={locations} />}
        {activeSection === 'dungeons' && <DungeonsSection dungeons={dungeons} setDungeons={setDungeons} locations={locations} />}
      </div>
    </div>
  )
}
