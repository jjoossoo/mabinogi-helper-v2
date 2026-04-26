'use client'

import { useState, useTransition } from 'react'
import { addTrade, updateTrade, deleteTrade } from '@/app/actions/trades'

const SCOPE_LABELS = { character: '캐릭터', server: '서버' }
const CYCLE_LABELS = { daily: '일일', weekly: '주간' }

function TradeModal({ trade, items, onSave, onClose }) {
  const [form, setForm] = useState({
    npc_name: trade?.npc_name ?? '',
    give_item_id: trade?.give_item?.id ?? '',
    give_amount: trade?.give_amount ?? 1,
    receive_item_id: trade?.receive_item?.id ?? '',
    receive_amount: trade?.receive_amount ?? 1,
    scope: trade?.scope ?? 'character',
    reset_cycle: trade?.reset_cycle ?? 'daily',
  })
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

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
      }
      const result = trade
        ? await updateTrade(trade.id, payload)
        : await addTrade(payload)
      if (result.error) return setError(result.error)
      onSave(result.trade)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-md rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h2 className="font-serif font-semibold tracking-wide" style={{ color: 'var(--gold-dark)' }}>
            ✦ {trade ? '교환 수정' : '교환 추가'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60" style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>NPC 이름 *</label>
            <input
              type="text"
              value={form.npc_name}
              onChange={e => set('npc_name', e.target.value)}
              placeholder="NPC 이름"
              maxLength={40}
              className="input-field w-full rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>주는 아이템 *</label>
              <select value={form.give_item_id} onChange={e => set('give_item_id', e.target.value)} className="input-field w-full rounded px-3 py-2 text-sm">
                <option value="">선택</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>수량</label>
              <input
                type="number" value={form.give_amount}
                onChange={e => set('give_amount', e.target.value)}
                min={1} className="input-field w-full rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>받는 아이템 *</label>
              <select value={form.receive_item_id} onChange={e => set('receive_item_id', e.target.value)} className="input-field w-full rounded px-3 py-2 text-sm">
                <option value="">선택</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>수량</label>
              <input
                type="number" value={form.receive_amount}
                onChange={e => set('receive_amount', e.target.value)}
                min={1} className="input-field w-full rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--ink)' }}>범위</label>
            <div className="flex gap-4">
              {['character', 'server'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="scope" value={s}
                    checked={form.scope === s} onChange={() => set('scope', s)}
                    style={{ accentColor: 'var(--sage)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{SCOPE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--ink)' }}>초기화 주기</label>
            <div className="flex gap-4">
              {['daily', 'weekly'].map(c => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="reset_cycle" value={c}
                    checked={form.reset_cycle === c} onChange={() => set('reset_cycle', c)}
                    style={{ accentColor: 'var(--sage)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{CYCLE_LABELS[c]}</span>
                </label>
              ))}
            </div>
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

export default function TradesTab({ trades, setTrades, items }) {
  const [modal, setModal] = useState(null) // null | 'add' | trade object
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState(null)

  const npcGroups = trades.reduce((acc, t) => {
    if (!acc[t.npc_name]) acc[t.npc_name] = []
    acc[t.npc_name].push(t)
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
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>전체 {trades.length}개</span>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ 추가</button>
      </div>

      <div className="flex-1 overflow-y-auto dots-bg p-4 space-y-4">
        {Object.entries(npcGroups).length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--ink)', opacity: 0.35 }}>등록된 교환이 없습니다</p>
        )}
        {Object.entries(npcGroups).map(([npc, list]) => (
          <div key={npc} className="panel rounded-lg overflow-hidden">
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.06)' }}>
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
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,124,95,0.12)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.3)' }}>
                        {SCOPE_LABELS[trade.scope]}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        {CYCLE_LABELS[trade.reset_cycle]}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal(trade)} className="btn-ghost-sm px-2 py-1 rounded text-xs">수정</button>
                    <button
                      onClick={() => handleDelete(trade)}
                      disabled={deletingId === trade.id}
                      className="btn-danger text-xs px-2 py-1 rounded"
                    >
                      {deletingId === trade.id ? '...' : '삭제'}
                    </button>
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
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
