'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addNpc, updateNpc, deleteNpc, addNpcSaleItem, removeNpcSaleItem } from '@/app/actions/npcs'
import { addTrade, updateTrade, deleteTrade } from '@/app/actions/trades'
import ResetFields from './ResetFields'

const SCOPE_LABELS = { character: '캐릭터', server: '서버' }
const RESET_LABELS = { none: '없음', daily: '일일', weekly: '주간' }

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

function TradeInlineForm({ npc, items, trade, onSave, onCancel }) {
  const [form, setForm] = useState({
    npc_id: npc.id,
    npc_name: npc.name,
    location_id: npc.location?.id ?? '',
    location: npc.location?.name ?? '',
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

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.give_item_id) return setError('주는 아이템을 선택해 주세요')
    if (!form.receive_item_id) return setError('받는 아이템을 선택해 주세요')
    setError(null)
    startTransition(async () => {
      const payload = {
        ...form,
        give_amount: Number(form.give_amount) || 1,
        receive_amount: Number(form.receive_amount) || 1,
      }
      const result = trade ? await updateTrade(trade.id, payload) : await addTrade(payload)
      if (result.error) return setError(result.error)
      onSave(result.trade)
    })
  }

  const itemOptions = items.map(i => ({ value: i.id, label: i.name, emoji: i.emoji }))
  const giveItem = items.find(i => i.id === form.give_item_id)
  const receiveItem = items.find(i => i.id === form.receive_item_id)

  return (
    <form onSubmit={handleSubmit}
      className="rounded-lg p-3 space-y-3 mt-2"
      style={{ background: 'rgba(17,12,4,0.5)', border: '1px solid rgba(201,168,76,0.25)' }}>
      {error && (
        <p className="text-xs rounded px-2 py-1.5"
          style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>주는 아이템 *</label>
          <SearchSelect
            selectedLabel={giveItem ? `${giveItem.emoji} ${giveItem.name}` : ''}
            onSelect={opt => set('give_item_id', opt.value)}
            options={itemOptions}
            placeholder="아이템 검색..."
          />
        </div>
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>수량</label>
          <input type="number" value={form.give_amount}
            onChange={e => set('give_amount', e.target.value)}
            onFocus={e => e.target.select()}
            min={1} className="input-field w-full rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>받는 아이템 *</label>
          <SearchSelect
            selectedLabel={receiveItem ? `${receiveItem.emoji} ${receiveItem.name}` : ''}
            onSelect={opt => set('receive_item_id', opt.value)}
            options={itemOptions}
            placeholder="아이템 검색..."
          />
        </div>
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>수량</label>
          <input type="number" value={form.receive_amount}
            onChange={e => set('receive_amount', e.target.value)}
            onFocus={e => e.target.select()}
            min={1} className="input-field w-full rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>범위</span>
        {['character', 'server'].map(s => (
          <label key={s} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name={`scope-${trade?.id ?? 'new'}`} value={s}
              checked={form.scope === s} onChange={() => set('scope', s)}
              style={{ accentColor: 'var(--sage)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>{SCOPE_LABELS[s]}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>초기화 설정</label>
        <ResetFields
          resetType={form.reset_type}
          resetDay={form.reset_day}
          resetHour={form.reset_hour}
          onChange={(k, v) => set(k, v)}
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded text-sm btn-danger">취소</button>
        <button type="submit" disabled={isPending} className="flex-1 py-2 rounded text-sm btn-primary">
          {isPending ? '저장 중...' : trade ? '수정' : '추가'}
        </button>
      </div>
    </form>
  )
}

function Divider({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.2)' }} />
      <span className="text-xs font-semibold font-serif flex-shrink-0" style={{ color: 'var(--gold)', opacity: 0.85 }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.2)' }} />
      {children}
    </div>
  )
}

function NpcModal({ npc: initialNpc, items, locations, onUpdate, onClose }) {
  const [savedNpc, setSavedNpc] = useState(initialNpc)
  const [basicForm, setBasicForm] = useState({
    name: initialNpc?.name ?? '',
    emoji: initialNpc?.emoji ?? '🏪',
    location_id: initialNpc?.location?.id ?? '',
  })
  const [basicError, setBasicError] = useState(null)
  const [basicPending, startBasicTransition] = useTransition()
  const [saleSearch, setSaleSearch] = useState('')
  const [tradeForm, setTradeForm] = useState(null)

  const locById = Object.fromEntries((locations ?? []).map(l => [l.id, l]))
  function locLabel(l) {
    if (!l) return '미지정'
    const parent = l.parent_id ? locById[l.parent_id] : null
    return parent ? `${parent.emoji} ${parent.name} · ${l.emoji} ${l.name}` : `${l.emoji} ${l.name}`
  }
  const locationOptions = [
    { value: '', label: '미지정' },
    ...(locations ?? []).map(l => ({ value: l.id, label: locLabel(l) })),
  ]
  const selectedLoc = (locations ?? []).find(l => l.id === basicForm.location_id)

  const saleItems = savedNpc?.npc_sale_items ?? []
  const npcTrades = savedNpc?.trades ?? []

  function setBasic(k, v) { setBasicForm(p => ({ ...p, [k]: v })) }

  function handleBasicSubmit(e) {
    e.preventDefault()
    if (!basicForm.name.trim()) return setBasicError('NPC 이름을 입력해 주세요')
    setBasicError(null)
    startBasicTransition(async () => {
      const result = savedNpc
        ? await updateNpc(savedNpc.id, basicForm)
        : await addNpc(basicForm)
      if (result.error) return setBasicError(result.error)
      setSavedNpc(result.npc)
      onUpdate(result.npc)
    })
  }

  async function handleAddSaleItem(item) {
    const result = await addNpcSaleItem(savedNpc.id, item.id)
    if (result.error) { alert(result.error); return }
    const updated = { ...savedNpc, npc_sale_items: [...saleItems, result.saleItem] }
    setSavedNpc(updated)
    onUpdate(updated)
    setSaleSearch('')
  }

  async function handleRemoveSaleItem(saleItemId) {
    const result = await removeNpcSaleItem(saleItemId)
    if (result.error) { alert(result.error); return }
    const updated = { ...savedNpc, npc_sale_items: saleItems.filter(si => si.id !== saleItemId) }
    setSavedNpc(updated)
    onUpdate(updated)
  }

  function handleTradeSave(trade) {
    const existing = npcTrades.find(t => t.id === trade.id)
    const nextTrades = existing
      ? npcTrades.map(t => t.id === trade.id ? trade : t)
      : [...npcTrades, trade]
    const updated = { ...savedNpc, trades: nextTrades }
    setSavedNpc(updated)
    onUpdate(updated)
    setTradeForm(null)
  }

  async function handleDeleteTrade(tradeId) {
    if (!confirm('교환 항목을 삭제할까요?')) return
    const result = await deleteTrade(tradeId)
    if (result.error) { alert(result.error); return }
    const updated = { ...savedNpc, trades: npcTrades.filter(t => t.id !== tradeId) }
    setSavedNpc(updated)
    onUpdate(updated)
    if (tradeForm?.id === tradeId) setTradeForm(null)
  }

  const existingSaleIds = new Set(saleItems.map(si => si.item?.id ?? si.item_id))
  const saleSearchResults = saleSearch.trim()
    ? items.filter(i => i.name.includes(saleSearch.trim()) && !existingSaleIds.has(i.id)).slice(0, 8)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h2 className="font-serif font-semibold tracking-wide" style={{ color: 'var(--gold-dark)' }}>
            ✦ {savedNpc ? 'NPC 수정' : 'NPC 추가'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* 기본 정보 */}
          <form onSubmit={handleBasicSubmit} className="space-y-3">
            {basicError && (
              <p className="text-sm rounded px-3 py-2"
                style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
                {basicError}
              </p>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>이름 *</label>
                <input
                  value={basicForm.name}
                  onChange={e => setBasic('name', e.target.value)}
                  placeholder="NPC 이름"
                  className="input-field w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="w-20">
                <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>이모지</label>
                <input
                  value={basicForm.emoji}
                  onChange={e => setBasic('emoji', e.target.value)}
                  className="input-field w-full rounded px-3 py-2 text-sm text-center"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>위치</label>
              <SearchSelect
                selectedLabel={locLabel(selectedLoc)}
                onSelect={opt => setBasic('location_id', opt.value)}
                options={locationOptions}
                placeholder="위치 검색..."
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={basicPending} className="btn-primary px-5 py-2 rounded text-sm">
                {basicPending ? '저장 중...' : savedNpc ? '기본 정보 저장' : 'NPC 생성 →'}
              </button>
            </div>
          </form>

          {savedNpc && (
            <>
              {/* 판매 아이템 */}
              <div className="space-y-2">
                <Divider label="판매 아이템" />
                <div className="relative">
                  <input
                    value={saleSearch}
                    onChange={e => setSaleSearch(e.target.value)}
                    placeholder="아이템 검색 후 추가..."
                    className="input-field w-full rounded px-3 py-2 text-sm"
                  />
                  {saleSearchResults.length > 0 && (
                    <ul className="absolute z-10 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded shadow-xl"
                      style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
                      {saleSearchResults.map(item => (
                        <li key={item.id}>
                          <button type="button"
                            onClick={() => handleAddSaleItem(item)}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                            style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}>
                            <span>{item.emoji}</span>
                            <span>{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {saleItems.length > 0 ? (
                  <div className="space-y-1">
                    {saleItems.map(si => (
                      <div key={si.id} className="panel dots-bg flex items-center gap-2 rounded px-3 py-2">
                        <span className="text-base">{si.item?.emoji ?? '📦'}</span>
                        <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>{si.item?.name}</span>
                        <button onClick={() => handleRemoveSaleItem(si.id)}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--crimson-light)' }}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-1" style={{ color: 'var(--ink)', opacity: 0.3 }}>
                    판매 아이템이 없습니다
                  </p>
                )}
              </div>

              {/* 물물교환 */}
              <div className="space-y-2">
                <Divider label="물물교환">
                  {!tradeForm && (
                    <button onClick={() => setTradeForm('add')}
                      className="btn-ghost-sm text-xs px-2 py-0.5 rounded flex-shrink-0">
                      + 추가
                    </button>
                  )}
                </Divider>

                {tradeForm && (
                  <TradeInlineForm
                    npc={savedNpc}
                    items={items}
                    trade={tradeForm === 'add' ? null : tradeForm}
                    onSave={handleTradeSave}
                    onCancel={() => setTradeForm(null)}
                  />
                )}

                {npcTrades.length > 0 ? (
                  <div className="space-y-2">
                    {npcTrades.map(trade => (
                      <div key={trade.id} className="panel rounded-lg px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap text-sm" style={{ color: 'var(--ink)' }}>
                              <span>{trade.give_item?.emoji} {trade.give_item?.name}</span>
                              <span style={{ opacity: 0.5 }}>×{trade.give_amount}</span>
                              <span style={{ color: 'var(--gold-dark)' }}>→</span>
                              <span>{trade.receive_item?.emoji} {trade.receive_item?.name}</span>
                              <span style={{ opacity: 0.5 }}>×{trade.receive_amount}</span>
                            </div>
                            <div className="flex gap-1.5 mt-1.5">
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
                          <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                            <button onClick={() => setTradeForm(tradeForm?.id === trade.id ? null : trade)}
                              className="btn-ghost-sm text-xs px-2 py-0.5 rounded">수정</button>
                            <button onClick={() => handleDeleteTrade(trade.id)}
                              className="btn-danger text-xs px-2 py-0.5 rounded">삭제</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !tradeForm && (
                  <p className="text-xs text-center py-1" style={{ color: 'var(--ink)', opacity: 0.3 }}>
                    등록된 물물교환이 없습니다
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NpcsTab({ npcs: npcsProp, setNpcs, items, locations }) {
  const npcs = npcsProp ?? []
  const [modal, setModal] = useState(null)
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState(null)

  const locById = Object.fromEntries((locations ?? []).map(l => [l.id, l]))
  function locLabel(l) {
    if (!l) return null
    const parent = l.parent_id ? locById[l.parent_id] : null
    return parent ? `${parent.emoji} ${parent.name} · ${l.emoji} ${l.name}` : `${l.emoji} ${l.name}`
  }

  function handleUpdate(npc) {
    setNpcs(prev => {
      const exists = prev.find(n => n.id === npc.id)
      return exists ? prev.map(n => n.id === npc.id ? npc : n) : [...prev, npc]
    })
  }

  function handleDelete(npc) {
    if (!confirm(`"${npc.name}" NPC를 삭제할까요? 연결된 판매 아이템도 함께 삭제됩니다.`)) return
    setDeletingId(npc.id)
    startTransition(async () => {
      const result = await deleteNpc(npc.id)
      if (!result.error) setNpcs(prev => prev.filter(n => n.id !== npc.id))
      setDeletingId(null)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>전체 {npcs.length}개</span>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ NPC 추가</button>
      </div>

      <div className="flex-1 overflow-y-auto dots-bg p-4 space-y-3">
        {npcs.length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--ink)', opacity: 0.35 }}>
            등록된 NPC가 없습니다
          </p>
        )}

        {npcs.filter(Boolean).map(npc => {
          const saleItems = npc.npc_sale_items ?? []
          const trades = npc.trades ?? []
          return (
            <div key={npc.id} className="panel rounded-lg overflow-hidden">
              {/* NPC 헤더 */}
              <div className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: (saleItems.length > 0 || trades.length > 0) ? '1px solid rgba(201,168,76,0.15)' : 'none', backgroundColor: 'rgba(201,168,76,0.04)' }}>
                <span className="text-xl flex-shrink-0">{npc.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-sm" style={{ color: 'var(--gold-dark)' }}>{npc.name}</p>
                  {npc.location && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink)', opacity: 0.5 }}>
                      📍 {locLabel(npc.location)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0" style={{ color: 'var(--ink)', opacity: 0.4 }}>
                  {saleItems.length > 0 && <span>판매 {saleItems.length}</span>}
                  {trades.length > 0 && <span>교환 {trades.length}</span>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setModal(npc)} className="btn-ghost-sm text-xs px-2 py-1 rounded">수정</button>
                  <button onClick={() => handleDelete(npc)} disabled={deletingId === npc.id}
                    className="btn-danger text-xs px-2 py-1 rounded">
                    {deletingId === npc.id ? '...' : '삭제'}
                  </button>
                </div>
              </div>

              {/* 판매 아이템 미리보기 */}
              {saleItems.length > 0 && (
                <div className="px-4 py-2.5 flex flex-wrap gap-1.5"
                  style={{ borderBottom: trades.length > 0 ? '1px solid rgba(201,168,76,0.1)' : 'none' }}>
                  <span className="text-xs flex-shrink-0 self-center" style={{ color: 'var(--gold-dark)', opacity: 0.6 }}>판매</span>
                  {saleItems.map(si => (
                    <span key={si.id} className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'rgba(138,106,31,0.1)', color: 'var(--ink)', opacity: 0.75, border: '1px solid rgba(138,106,31,0.2)' }}>
                      {si.item?.emoji} {si.item?.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 물물교환 미리보기 */}
              {trades.length > 0 && (
                <div className="px-4 py-2.5 space-y-1">
                  <span className="text-xs" style={{ color: 'var(--gold-dark)', opacity: 0.6 }}>교환</span>
                  {trades.map(t => (
                    <p key={t.id} className="text-xs" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                      {t.give_item?.emoji} {t.give_item?.name} ×{t.give_amount}
                      <span style={{ color: 'var(--gold-dark)' }}> → </span>
                      {t.receive_item?.emoji} {t.receive_item?.name} ×{t.receive_amount}
                      <span style={{ opacity: 0.5 }}> · {SCOPE_LABELS[t.scope]} · {RESET_LABELS[t.reset_type] ?? '없음'}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <NpcModal
          npc={modal === 'add' ? null : modal}
          items={items}
          locations={locations ?? []}
          onUpdate={handleUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
