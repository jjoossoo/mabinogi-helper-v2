'use client'

import { useState, useEffect, useTransition, useOptimistic } from 'react'
import { createClient } from '@/lib/supabase'
import { upsertTradeProgress } from '@/app/actions/trades'

function getKSTDayStart() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}

function getKSTWeekStart() {
  const dayStart = getKSTDayStart()
  const kst = new Date(dayStart.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay() // 0=Sun
  kst.setUTCDate(kst.getUTCDate() - day)
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}

function isExpired(progress, reset_cycle) {
  if (!progress?.completed || !progress.completed_at) return true
  const completedAt = new Date(progress.completed_at)
  const resetAt = reset_cycle === 'weekly' ? getKSTWeekStart() : getKSTDayStart()
  return completedAt < resetAt
}

export default function TradesPanel({ character }) {
  const [trades, setTrades] = useState([])
  const [progress, setProgress] = useState({}) // key: trade_id → { completed, completed_at }
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!character) return
    loadData()
  }, [character?.id])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    const { data: tradeList } = await supabase
      .from('trades')
      .select('*, give_item:give_item_id(id, name, emoji), receive_item:receive_item_id(id, name, emoji)')
      .order('npc_name')

    if (!tradeList) { setLoading(false); return }

    setTrades(tradeList)

    // 캐릭터 scope 진행도
    const charIds = tradeList.filter(t => t.scope === 'character').map(t => t.id)
    // 서버 scope 진행도
    const serverIds = tradeList.filter(t => t.scope === 'server').map(t => t.id)

    const progressMap = {}

    if (charIds.length) {
      const { data: charProgress } = await supabase
        .from('trade_progress')
        .select('trade_id, completed, completed_at')
        .eq('character_id', character.id)
        .in('trade_id', charIds)
      charProgress?.forEach(p => { progressMap[p.trade_id] = p })
    }

    if (serverIds.length) {
      const { data: serverProgress } = await supabase
        .from('trade_progress')
        .select('trade_id, completed, completed_at')
        .eq('server', character.server)
        .is('character_id', null)
        .in('trade_id', serverIds)
      serverProgress?.forEach(p => { progressMap[p.trade_id] = p })
    }

    setProgress(progressMap)
    setLoading(false)
  }

  function handleToggle(trade) {
    const current = progress[trade.id]
    const expired = isExpired(current, trade.reset_cycle)
    const newCompleted = expired ? true : !current?.completed

    // optimistic update
    setProgress(prev => ({
      ...prev,
      [trade.id]: { completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
    }))

    startTransition(async () => {
      const payload = {
        trade_id: trade.id,
        completed: newCompleted,
        character_id: trade.scope === 'character' ? character.id : null,
        server: trade.scope === 'server' ? character.server : null,
      }
      const result = await upsertTradeProgress(payload)
      if (result.error) {
        // rollback
        setProgress(prev => ({ ...prev, [trade.id]: current }))
      }
    })
  }

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--parchment)', opacity: 0.25 }}>
        <div className="text-5xl mb-3">🔄</div>
        <p className="text-sm">캐릭터를 선택하세요</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.4 }}>불러오는 중...</p>
      </div>
    )
  }

  if (!trades.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--parchment)', opacity: 0.25 }}>
        <div className="text-5xl mb-3">🏪</div>
        <p className="text-sm">등록된 물물교환이 없습니다</p>
      </div>
    )
  }

  const npcGroups = trades.reduce((acc, t) => {
    if (!acc[t.npc_name]) acc[t.npc_name] = []
    acc[t.npc_name].push(t)
    return acc
  }, {})

  const SCOPE_LABELS = { character: '캐릭터', server: '서버' }
  const CYCLE_LABELS = { daily: '일일', weekly: '주간' }

  return (
    <div className="space-y-4">
      {Object.entries(npcGroups).map(([npc, list]) => (
        <div key={npc} className="panel rounded-lg overflow-hidden">
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.06)' }}>
            <span className="font-serif font-semibold text-sm" style={{ color: 'var(--gold-dark)' }}>🏪 {npc}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
            {list.map(trade => {
              const prog = progress[trade.id]
              const expired = isExpired(prog, trade.reset_cycle)
              const done = prog?.completed && !expired

              return (
                <div
                  key={trade.id}
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors"
                  style={{ backgroundColor: done ? 'rgba(74,124,95,0.06)' : 'transparent' }}
                  onClick={() => handleToggle(trade)}
                >
                  {/* 체크박스 */}
                  <div
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors"
                    style={{
                      backgroundColor: done ? 'var(--sage)' : 'transparent',
                      borderColor: done ? 'var(--sage)' : 'rgba(138,106,31,0.4)',
                    }}
                  >
                    {done && <span className="text-xs text-white leading-none">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-center gap-2 flex-wrap text-sm"
                      style={{ color: 'var(--ink)', opacity: done ? 0.45 : 1 }}
                    >
                      <span>{trade.give_item?.emoji} {trade.give_item?.name}</span>
                      <span style={{ opacity: 0.5 }}>×{trade.give_amount}</span>
                      <span style={{ color: 'var(--gold-dark)' }}>→</span>
                      <span>{trade.receive_item?.emoji} {trade.receive_item?.name}</span>
                      <span style={{ opacity: 0.5 }}>×{trade.receive_amount}</span>
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
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
