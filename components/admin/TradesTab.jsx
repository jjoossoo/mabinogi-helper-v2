'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addTrade, updateTrade, deleteTrade } from '@/app/actions/trades'
import ResetFields from './ResetFields'

const SCOPE_LABELS = { character: '캐릭터', server: '서버' }
const RESET_LABELS = { none: '없음', daily: '일일', weekly: '주간' }

// 자유 입력 + 기존 값 제안 (NPC명, 위치)
function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filtered = value.trim()
    ? suggestions.filter(s => s.label.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
    : suggestions.slice(0, 10)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder}
        className="input-field w-full rounded px-3 py-2 text-sm"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
          {filtered.map(s => (
            <li key={s.value}>
              <button type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(s); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}>
                <span className="flex-1">{s.label}</span>
                {s.sub && <span className="text-xs flex-shrink-0" style={{ opacity: 0.45 }}>{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// 기존 옵션에서만 선택 (아이템)
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

function TradeModal({ trade, items, trades, locations, onSave, onClose }) {
  const [form, setForm] = useState({
    npc_name: trade?.npc_name ?? '',
    location: trade?.location ?? '',
    location_id: trade?.location_info?.id ?? '',
    give_item_id: trade?.give_item?.id ?? '',
    give_amount: trade?.give_amount ?? 1,
    receive_item_id: trade?.receive_item?.id ?? '',
    receive_amount: trade?.receive_amount ?? 1,
    scope: trade?.scope ?? 'character',
    reset_type: trade?.reset_type ?? 'none',
    reset_day: trade?.reset_day ?? null,
    reset_hour: trade?.reset_hour ?? 6,
  })
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // 기존 NPC 목록 (npc_name → location 매핑)
  const npcMap = new Map()
  trades.forEach(t => { if (!npcMap.has(t.npc_name)) npcMap.set(t.npc_name, t.location ?? '') })
  const npcSuggestions = [...npcMap.entries()].map(([name, loc]) => ({
    value: name, label: name, sub: loc || undefined,
  }))

  // 기존 위치 목록
  const locationSuggestions = [...new Set(trades.map(t => t.location).filter(Boolean))].map(loc => ({
    value: loc, label: loc,
  }))

  const locationOptions = [
    { value: '', label: '미지정' },
    ...(locations ?? []).map(l => ({ value: l.id, label: l.name, emoji: l.emoji })),
  ]
  const selectedLocationInfo = (locations ?? []).find(l => l.id === form.location_id)

  const itemOptions = items.map(i => ({ value: i.id, label: i.name, emoji: i.emoji }))
  const giveItem = items.find(i => i.id === form.give_item_id)
  const receiveItem = items.find(i => i.id === form.receive_item_id)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.npc_name.trim()) return setError('NPC 이름을 입력해 주세요')
    if (!form.give_item_id) return setError('주는 아이템을 선택해 주세요')
    if (!form.receive_item_id) return setError('받는 아이템을 선택해 주세요')
    setError(null)
    startTransition(async () => {
      const payload = {
        ...form,
        give_amount: Number(form.give_amount) || 1,
        receive_amount: Number(form.receive_amount) || 1,
        reset_day: form.reset_day ?? null,
        reset_hour: form.reset_hour ?? 6,
      }
      const result = trade ? await updateTrade(trade.id, payload) : await addTrade(payload)
      if (result.error) return setError(result.error)
      onSave(result.trade)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-md rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h2 className="font-serif font-semibold tracking-wide" style={{ color: 'var(--gold-dark)' }}>
            ✦ {trade ? '교환 수정' : '교환 추가'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{
              background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)',
            }}>{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>NPC 이름 *</label>
              <AutocompleteInput
                value={form.npc_name}
                onChange={v => set('npc_name', v)}
                onSelect={s => { set('npc_name', s.value); if (s.sub) set('location', s.sub) }}
                suggestions={npcSuggestions}
                placeholder="NPC 이름"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>위치 (텍스트)</label>
              <AutocompleteInput
                value={form.location}
                onChange={v => set('location', v)}
                onSelect={s => set('location', s.value)}
                suggestions={locationSuggestions}
                placeholder="예: 티르 코네일"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>경로 계산 위치</label>
            <SearchSelect
              selectedLabel={selectedLocationInfo ? `${selectedLocationInfo.emoji} ${selectedLocationInfo.name}` : '미지정'}
              onSelect={opt => set('location_id', opt.value)}
              options={locationOptions}
              placeholder="위치 검색..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>주는 아이템 *</label>
              <SearchSelect
                selectedLabel={giveItem ? `${giveItem.emoji} ${giveItem.name}` : ''}
                onSelect={opt => set('give_item_id', opt.value)}
                options={itemOptions}
                placeholder="아이템 검색..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>수량</label>
              <input type="number" value={form.give_amount}
                onChange={e => set('give_amount', e.target.value)}
                onFocus={e => e.target.select()}
                min={1} className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>받는 아이템 *</label>
              <SearchSelect
                selectedLabel={receiveItem ? `${receiveItem.emoji} ${receiveItem.name}` : ''}
                onSelect={opt => set('receive_item_id', opt.value)}
                options={itemOptions}
                placeholder="아이템 검색..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>수량</label>
              <input type="number" value={form.receive_amount}
                onChange={e => set('receive_amount', e.target.value)}
                onFocus={e => e.target.select()}
                min={1} className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--ink)' }}>범위</label>
            <div className="flex gap-4">
              {['character', 'server'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="scope" value={s}
                    checked={form.scope === s} onChange={() => set('scope', s)}
                    style={{ accentColor: 'var(--sage)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{SCOPE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--ink)' }}>초기화 설정</label>
            <ResetFields
              resetType={form.reset_type}
              resetDay={form.reset_day}
              resetHour={form.reset_hour}
              onChange={(k, v) => set(k, v)}
            />
          </div>

          <div className="flex gap-3 pt-2 pb-1">
            <button type="button" onClick={onClose} className="btn-danger flex-1 py-3 rounded text-sm">취소</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1 py-3 rounded text-sm">
              {isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TradesTab({ trades, setTrades, items, locations }) {
  const [modal, setModal] = useState(null)
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState(null)

  // 위치 → NPC → 교환 목록
  const locationGroups = trades.reduce((acc, t) => {
    const loc = t.location?.trim() || '(위치 미지정)'
    if (!acc[loc]) acc[loc] = {}
    if (!acc[loc][t.npc_name]) acc[loc][t.npc_name] = []
    acc[loc][t.npc_name].push(t)
    return acc
  }, {})

  function handleSave(trade) {
    setTrades(prev => {
      const exists = prev.find(t => t.id === trade.id)
      return exists ? prev.map(t => t.id === trade.id ? trade : t) : [...prev, trade]
    })
    setModal(null)
  }

  function handleDelete(trade) {
    if (!confirm(`"${trade.npc_name}" 교환을 삭제할까요?`)) return
    setDeletingId(trade.id)
    startTransition(async () => {
      const result = await deleteTrade(trade.id)
      if (!result.error) setTrades(prev => prev.filter(t => t.id !== trade.id))
      setDeletingId(null)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>전체 {trades.length}개</span>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ 추가</button>
      </div>

      <div className="flex-1 overflow-y-auto dots-bg p-4 space-y-6">
        {Object.entries(locationGroups).length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--ink)', opacity: 0.35 }}>등록된 교환이 없습니다</p>
        )}

        {Object.entries(locationGroups).map(([location, npcGroups]) => (
          <div key={location}>
            {/* 위치 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold font-serif flex-shrink-0" style={{ color: 'var(--gold)' }}>
                📍 {location}
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.25)' }} />
            </div>

            {/* NPC 카드 목록 */}
            <div className="space-y-3 pl-2">
              {Object.entries(npcGroups).map(([npc, list]) => (
                <div key={npc} className="panel rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5"
                    style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.06)' }}>
                    <span className="font-serif font-semibold text-sm" style={{ color: 'var(--gold-dark)' }}>🏪 {npc}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                    {list.map(trade => (
                      <div key={trade.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: 'var(--ink)' }}>
                            <span>{trade.give_item?.emoji} {trade.give_item?.name}</span>
                            <span style={{ opacity: 0.45 }}>×{trade.give_amount}</span>
                            <span style={{ color: 'var(--gold-dark)' }}>→</span>
                            <span>{trade.receive_item?.emoji} {trade.receive_item?.name}</span>
                            <span style={{ opacity: 0.45 }}>×{trade.receive_amount}</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(74,124,95,0.12)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.3)' }}>
                              {SCOPE_LABELS[trade.scope]}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(201,168,76,0.3)' }}>
                              {RESET_LABELS[trade.reset_type] ?? '없음'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setModal(trade)} className="btn-ghost-sm px-2 py-1 rounded text-xs">수정</button>
                          <button onClick={() => handleDelete(trade)} disabled={deletingId === trade.id}
                            className="btn-danger text-xs px-2 py-1 rounded">
                            {deletingId === trade.id ? '...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <TradeModal
          trade={modal === 'add' ? null : modal}
          items={items}
          trades={trades}
          locations={locations ?? []}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
