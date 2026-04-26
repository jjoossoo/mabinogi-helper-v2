'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase'
import { upsertTradeProgress, removeTradeProgress } from '@/app/actions/trades'

function getKSTDayStart() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}

function getKSTWeekStart() {
  const dayStart = getKSTDayStart()
  const kst = new Date(dayStart.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay()
  kst.setUTCDate(kst.getUTCDate() - day)
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}

function isExpired(prog, reset_cycle) {
  if (!prog?.completed || !prog.completed_at) return true
  return new Date(prog.completed_at) < (reset_cycle === 'weekly' ? getKSTWeekStart() : getKSTDayStart())
}

function groupByLocationNpc(tradeList) {
  return tradeList.reduce((acc, t) => {
    const loc = t.location?.trim() || '(위치 미지정)'
    if (!acc[loc]) acc[loc] = {}
    if (!acc[loc][t.npc_name]) acc[loc][t.npc_name] = []
    acc[loc][t.npc_name].push(t)
    return acc
  }, {})
}

const SCOPE_LABELS = { character: '캐릭터', server: '서버' }
const CYCLE_LABELS = { daily: '일일', weekly: '주간' }

function TradeRow({ trade, prog, onToggle, onRemove }) {
  const done = prog?.completed && !isExpired(prog, trade.reset_cycle)

  return (
    <div className="px-4 py-3 flex items-center gap-3"
      style={{ backgroundColor: done ? 'rgba(74,124,95,0.06)' : 'transparent' }}>
      <div
        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border cursor-pointer transition-colors"
        style={{
          backgroundColor: done ? 'var(--sage)' : 'transparent',
          borderColor: done ? 'var(--sage)' : 'rgba(138,106,31,0.4)',
        }}
        onClick={onToggle}
      >
        {done && <span className="text-xs text-white leading-none">✓</span>}
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2 flex-wrap text-sm"
          style={{ color: 'var(--ink)', opacity: done ? 0.45 : 1 }}>
          <span>{trade.give_item?.emoji} {trade.give_item?.name} ×{trade.give_amount}</span>
          <span style={{ color: 'var(--gold-dark)' }}>→</span>
          <span>{trade.receive_item?.emoji} {trade.receive_item?.name} ×{trade.receive_amount}</span>
        </div>
        <div className="flex gap-2 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(74,124,95,0.12)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.3)' }}>
            {SCOPE_LABELS[trade.scope]}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(201,168,76,0.3)' }}>
            {CYCLE_LABELS[trade.reset_cycle]}
          </span>
        </div>
      </div>

      <button
        onClick={onRemove}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs transition-opacity opacity-30 hover:opacity-80"
        style={{ color: 'var(--crimson-light)' }}
        title="목록에서 제거"
      >✕</button>
    </div>
  )
}

function AddModal({ unaddedTrades, onAdd, onClose }) {
  const grouped = groupByLocationNpc(unaddedTrades)
  const [collapsedLocs, setCollapsedLocs] = useState(new Set())
  const [collapsedNpcs, setCollapsedNpcs] = useState(new Set())
  const [adding, setAdding] = useState(new Set())

  function toggleLoc(loc) {
    setCollapsedLocs(prev => { const n = new Set(prev); n.has(loc) ? n.delete(loc) : n.add(loc); return n })
  }
  function toggleNpc(key) {
    setCollapsedNpcs(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleAdd(trade) {
    setAdding(prev => new Set([...prev, trade.id]))
    await onAdd(trade)
    setAdding(prev => { const n = new Set(prev); n.delete(trade.id); return n })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h2 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>✦ 교환 추가</h2>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60" style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {unaddedTrades.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--ink)', opacity: 0.4 }}>
              추가할 교환이 없습니다
            </p>
          )}

          {Object.entries(grouped).map(([loc, npcGroups]) => {
            const locCollapsed = collapsedLocs.has(loc)
            return (
              <div key={loc}>
                <button type="button" onClick={() => toggleLoc(loc)}
                  className="flex items-center gap-2 w-full mb-2 text-left">
                  <span className="text-xs" style={{ color: 'var(--gold-dark)', opacity: 0.6 }}>
                    {locCollapsed ? '▶' : '▼'}
                  </span>
                  <span className="text-xs font-semibold font-serif" style={{ color: 'var(--gold-dark)' }}>
                    📍 {loc}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.25)' }} />
                </button>

                {!locCollapsed && (
                  <div className="space-y-2 pl-2">
                    {Object.entries(npcGroups).map(([npc, list]) => {
                      const npcKey = `${loc}::${npc}`
                      const npcCollapsed = collapsedNpcs.has(npcKey)
                      return (
                        <div key={npc} className="panel rounded-lg overflow-hidden">
                          <button type="button" onClick={() => toggleNpc(npcKey)}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-left"
                            style={{
                              backgroundColor: 'rgba(201,168,76,0.06)',
                              borderBottom: npcCollapsed ? 'none' : '1px solid rgba(201,168,76,0.2)',
                            }}>
                            <span className="font-serif font-semibold text-sm flex-1" style={{ color: 'var(--gold-dark)' }}>
                              🏪 {npc}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>
                              {npcCollapsed ? '▶' : '▼'}
                            </span>
                          </button>

                          {!npcCollapsed && (
                            <div className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                              {list.map(trade => (
                                <div key={trade.id} className="px-4 py-3 flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: 'var(--ink)' }}>
                                      <span>{trade.give_item?.emoji} {trade.give_item?.name} ×{trade.give_amount}</span>
                                      <span style={{ color: 'var(--gold-dark)' }}>→</span>
                                      <span>{trade.receive_item?.emoji} {trade.receive_item?.name} ×{trade.receive_amount}</span>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      <span className="text-xs px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(74,124,95,0.12)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.3)' }}>
                                        {SCOPE_LABELS[trade.scope]}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(201,168,76,0.3)' }}>
                                        {CYCLE_LABELS[trade.reset_cycle]}
                                      </span>
                                    </div>
                                  </div>
                                  <button type="button"
                                    onClick={() => handleAdd(trade)}
                                    disabled={adding.has(trade.id)}
                                    className="btn-primary flex-shrink-0 text-xs px-3 py-1.5 rounded">
                                    {adding.has(trade.id) ? '...' : '+ 추가'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function TradesPanel({ character }) {
  const [trades, setTrades] = useState([])
  const [progress, setProgress] = useState({})
  const [collapsedLocs, setCollapsedLocs] = useState(new Set())
  const [collapsedNpcs, setCollapsedNpcs] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!character) return
    loadData()
  }, [character?.id])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    const [{ data: tradeList }, { data: charProg }, { data: serverProg }] = await Promise.all([
      supabase.from('trades')
        .select('*, give_item:give_item_id(id, name, emoji), receive_item:receive_item_id(id, name, emoji)')
        .order('npc_name'),
      supabase.from('trade_progress').select('trade_id, completed, completed_at').eq('character_id', character.id),
      supabase.from('trade_progress').select('trade_id, completed, completed_at')
        .eq('server', character.server).is('character_id', null),
    ])

    if (!tradeList) { setLoading(false); return }
    setTrades(tradeList)

    const progressMap = {}
    charProg?.forEach(p => { progressMap[p.trade_id] = p })
    serverProg?.forEach(p => { progressMap[p.trade_id] = p })
    setProgress(progressMap)
    setLoading(false)
  }

  // progress에 항목이 있는 것만 "추가된" 교환
  const addedTrades = trades.filter(t => progress[t.id] !== undefined)
  const unaddedTrades = trades.filter(t => progress[t.id] === undefined)
  const locationGroups = groupByLocationNpc(addedTrades)

  function toggleLoc(loc) {
    setCollapsedLocs(prev => { const n = new Set(prev); n.has(loc) ? n.delete(loc) : n.add(loc); return n })
  }
  function toggleNpc(key) {
    setCollapsedNpcs(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleAdd(trade) {
    // optimistic: progress 항목 추가
    setProgress(prev => ({ ...prev, [trade.id]: { completed: false, completed_at: null } }))
    const result = await upsertTradeProgress({
      trade_id: trade.id,
      completed: false,
      character_id: trade.scope === 'character' ? character.id : null,
      server: trade.scope === 'server' ? character.server : null,
    })
    if (result.error) {
      setProgress(prev => { const n = { ...prev }; delete n[trade.id]; return n })
    }
  }

  function handleRemove(trade) {
    const current = progress[trade.id]
    setProgress(prev => { const n = { ...prev }; delete n[trade.id]; return n })
    startTransition(async () => {
      const result = await removeTradeProgress({
        trade_id: trade.id,
        character_id: trade.scope === 'character' ? character.id : null,
        server: trade.scope === 'server' ? character.server : null,
      })
      if (result.error) setProgress(prev => ({ ...prev, [trade.id]: current }))
    })
  }

  function handleToggle(trade) {
    const current = progress[trade.id]
    const newCompleted = isExpired(current, trade.reset_cycle) ? true : !current?.completed
    setProgress(prev => ({
      ...prev,
      [trade.id]: { completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null },
    }))
    startTransition(async () => {
      const result = await upsertTradeProgress({
        trade_id: trade.id,
        completed: newCompleted,
        character_id: trade.scope === 'character' ? character.id : null,
        server: trade.scope === 'server' ? character.server : null,
      })
      if (result.error) setProgress(prev => ({ ...prev, [trade.id]: current }))
    })
  }

  if (!character) return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--parchment)', opacity: 0.25 }}>
      <div className="text-5xl mb-3">🔄</div>
      <p className="text-sm">캐릭터를 선택하세요</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.4 }}>불러오는 중...</p>
    </div>
  )

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs" style={{ color: 'var(--parchment)', opacity: 0.4 }}>
          {addedTrades.length > 0 ? `${addedTrades.length}개 교환` : ''}
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-sm px-4 py-2 rounded"
          style={{ minHeight: '40px' }}
        >
          + 교환 추가
        </button>
      </div>

      {/* 비어있을 때 */}
      {addedTrades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--parchment)', opacity: 0.25 }}>
          <div className="text-5xl mb-3">🔄</div>
          <p className="text-sm text-center">교환을 추가해 진행 상황을 관리하세요</p>
        </div>
      )}

      {/* 위치 → NPC → 교환 */}
      <div className="space-y-4">
        {Object.entries(locationGroups).map(([loc, npcGroups]) => {
          const locCollapsed = collapsedLocs.has(loc)
          return (
            <div key={loc}>
              {/* 위치 토글 헤더 */}
              <button type="button" onClick={() => toggleLoc(loc)}
                className="flex items-center gap-2 w-full mb-2 text-left">
                <span className="text-xs" style={{ color: 'var(--parchment)', opacity: 0.45 }}>
                  {locCollapsed ? '▶' : '▼'}
                </span>
                <span className="text-xs font-semibold font-serif" style={{ color: 'var(--parchment)', opacity: 0.55 }}>
                  📍 {loc}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(245,237,214,0.15)' }} />
              </button>

              {!locCollapsed && (
                <div className="space-y-3 pl-2">
                  {Object.entries(npcGroups).map(([npc, list]) => {
                    const npcKey = `${loc}::${npc}`
                    const npcCollapsed = collapsedNpcs.has(npcKey)
                    return (
                      <div key={npc} className="panel rounded-lg overflow-hidden">
                        {/* NPC 토글 헤더 */}
                        <button type="button" onClick={() => toggleNpc(npcKey)}
                          className="w-full px-4 py-2.5 flex items-center gap-2 text-left"
                          style={{
                            backgroundColor: 'rgba(201,168,76,0.06)',
                            borderBottom: npcCollapsed ? 'none' : '1px solid rgba(201,168,76,0.2)',
                          }}>
                          <span className="font-serif font-semibold text-sm flex-1" style={{ color: 'var(--gold-dark)' }}>
                            🏪 {npc}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>
                            {npcCollapsed ? '▶' : '▼'}
                          </span>
                        </button>

                        {!npcCollapsed && (
                          <div className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                            {list.map(trade => (
                              <TradeRow
                                key={trade.id}
                                trade={trade}
                                prog={progress[trade.id]}
                                onToggle={() => handleToggle(trade)}
                                onRemove={() => handleRemove(trade)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAddModal && (
        <AddModal
          unaddedTrades={unaddedTrades}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}
