'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase'
import { addCharacterContent, removeCharacterContent, upsertContentProgress } from '@/app/actions/contents'
import { isCompleted } from '@/lib/resetUtils'

const RESET_LABELS = { none: '없음', daily: '일일', weekly: '주간' }

function makeRi(content) {
  return { type: content.reset_type, day: content.reset_day, hour: content.reset_hour }
}

function isCondDone(cond, progress, ri) {
  const p = progress[cond.id]
  if (!p) return false
  if (!ri?.type || ri.type === 'none') {
    const val = p.value ?? 0
    return cond.type === 'check' ? val >= 1 : (cond.max_value != null && val >= cond.max_value)
  }
  return isCompleted(p.completed_at, ri.type, ri.day, ri.hour)
}

function isContentDone(content, progress) {
  const ri = makeRi(content)
  const conds = content.content_conditions ?? []
  return conds.length > 0 && conds.every(c => isCondDone(c, progress, ri))
}

// ── 조건 행 ─────────────────────────────────────────────────

function ConditionRow({ cond, ri, progress, onChange }) {
  const p = progress[cond.id]
  const val = p?.value ?? 0
  const done = isCondDone(cond, progress, ri)
  const nameStyle = {
    color: done ? 'var(--sage)' : 'var(--ink)',
    textDecoration: done ? 'line-through' : 'none',
    opacity: done ? 0.7 : 1,
  }

  if (cond.type === 'check') {
    return (
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={done}
          onChange={e => onChange(cond.id, 'check', e.target.checked, null)}
          className="w-4 h-4 flex-shrink-0"
          style={{ accentColor: 'var(--sage)' }} />
        <span className="text-xs flex-1" style={nameStyle}>{cond.name}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {cond.max_value != null && (
        <input type="checkbox" checked={done}
          onChange={e => onChange(cond.id, 'progress', e.target.checked ? cond.max_value : 0, cond.max_value)}
          className="w-4 h-4 flex-shrink-0"
          style={{ accentColor: 'var(--sage)' }} />
      )}
      <span className="text-xs flex-1" style={nameStyle}>{cond.name}</span>
      <input type="number" value={val} min={0} max={cond.max_value ?? undefined}
        onChange={e => onChange(cond.id, 'progress', e.target.value, cond.max_value)}
        onFocus={e => e.target.select()}
        className="input-field w-16 rounded px-2 py-0.5 text-xs text-center flex-shrink-0" />
      {cond.max_value != null && (
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink)', opacity: 0.45 }}>
          / {cond.max_value}
        </span>
      )}
    </div>
  )
}

// ── 콘텐츠 카드 ──────────────────────────────────────────────

function ContentCard({ content, progress, onChangeCondition, onRemove }) {
  const ri = makeRi(content)
  const done = isContentDone(content, progress)
  const conds = [...(content.content_conditions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const rewards = content.content_rewards ?? []
  const doneCount = conds.filter(c => isCondDone(c, progress, ri)).length
  const [open, setOpen] = useState(!done)

  useEffect(() => {
    if (done) setOpen(false)
  }, [done])

  return (
    <div
      className="panel dots-bg rounded-lg overflow-hidden transition-colors"
      style={done ? { borderColor: 'var(--sage)', boxShadow: '0 2px 12px rgba(74,124,95,0.2)' } : {}}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
        style={{ backgroundColor: done ? 'rgba(74,124,95,0.05)' : 'transparent' }}
      >
        <span className="text-xs flex-shrink-0" style={{ color: done ? 'var(--sage)' : 'var(--ink)', opacity: 0.5 }}>
          {open ? '▼' : '▶'}
        </span>
        <span className="font-medium text-sm flex-1" style={{ color: done ? 'var(--sage)' : 'var(--ink)' }}>
          {done && '✓ '}{content.name}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {conds.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.45 }}>
              {doneCount}/{conds.length}
            </span>
          )}
          <button onClick={onRemove} title="목록에서 제거"
            className="text-xs transition-opacity hover:opacity-70 p-0.5"
            style={{ color: 'var(--crimson-light)' }}>✕</button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(138,106,31,0.18)' }}>
          {conds.length > 0 && (
            <div className="space-y-2">
              {conds.map(cond => (
                <ConditionRow
                  key={cond.id}
                  cond={cond}
                  ri={ri}
                  progress={progress}
                  onChange={onChangeCondition}
                />
              ))}
            </div>
          )}
          {rewards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(138,106,31,0.2)' }}>
              {rewards.map(r => (
                <span key={r.id} className="text-xs px-2 py-0.5 rounded"
                  style={{ color: 'var(--gold-dark)', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)' }}>
                  {r.items?.emoji} {r.items?.name} ×{r.amount}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 콘텐츠 선택 모달 ─────────────────────────────────────────

function ContentPickerModal({ allContents, selectedIds, onToggle, onClose, activeCycle }) {
  const [cycle, setCycle] = useState(activeCycle)
  const [search, setSearch] = useState('')

  const filtered = allContents.filter(c =>
    c.reset_type === cycle &&
    (!search.trim() || c.name.includes(search.trim()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[88vh] sm:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>✦ 콘텐츠 선택</h3>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <div className="px-5 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="콘텐츠 검색..."
            className="input-field w-full rounded px-3 py-1.5 text-sm" />
          <div className="flex gap-1">
            {['daily', 'weekly'].map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={cycle === c
                  ? { backgroundColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }
                  : { color: 'var(--gold-dark)', border: '1px solid var(--gold)', background: 'transparent' }
                }>{RESET_LABELS[c]}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(content => {
            const isSelected = selectedIds.has(content.id)
            return (
              <div key={content.id}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[rgba(201,168,76,0.06)]"
                style={{ borderBottom: '1px solid rgba(138,106,31,0.12)' }}>
                <span className="text-sm flex-1" style={{ color: 'var(--ink)' }}>{content.name}</span>
                <button onClick={() => onToggle(content.id, isSelected)}
                  className={`ml-3 text-xs px-3 py-1 rounded flex-shrink-0 transition-colors ${isSelected ? 'btn-danger' : 'btn-primary'}`}>
                  {isSelected ? '제거' : '추가'}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>
              콘텐츠가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ContentsPanel ─────────────────────────────────────────────

export default function ContentsPanel({ characterId }) {
  const [allContents, setAllContents] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeCycle, setActiveCycle] = useState('daily')
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!characterId) return
    setLoading(true)
    async function fetchData() {
      const supabase = createClient()
      const [
        { data: contentData },
        { data: selectedData },
        { data: progressData, error: progressErr },
      ] = await Promise.all([
        supabase.from('contents')
          .select('*, content_conditions(id, name, type, max_value, sort_order), content_rewards(id, item_id, amount, items(name, emoji))')
          .order('sort_order').order('name'),
        supabase.from('character_contents').select('content_id').eq('character_id', characterId),
        supabase.from('content_progress').select('condition_id, value, completed_at').eq('character_id', characterId),
      ])
      setAllContents(contentData ?? [])
      setSelectedIds(new Set((selectedData ?? []).map(r => r.content_id)))
      if (progressErr) setError('진행상황 로드 실패: ' + progressErr.message)
      setProgress(Object.fromEntries(
        (progressData ?? []).map(p => [p.condition_id, { value: p.value ?? 0, completed_at: p.completed_at ?? null }])
      ))
      setLoading(false)
    }
    fetchData()
  }, [characterId])

  function handleToggle(contentId, isSelected) {
    setError(null)
    if (isSelected) {
      setSelectedIds(prev => { const s = new Set(prev); s.delete(contentId); return s })
      startTransition(async () => {
        const result = await removeCharacterContent(characterId, contentId)
        if (result?.error) {
          setSelectedIds(prev => new Set([...prev, contentId]))
          setError(result.error)
        }
      })
    } else {
      setSelectedIds(prev => new Set([...prev, contentId]))
      startTransition(async () => {
        const result = await addCharacterContent(characterId, contentId)
        if (result?.error) {
          setSelectedIds(prev => { const s = new Set(prev); s.delete(contentId); return s })
          setError(result.error)
        }
      })
    }
  }

  function handleChangeCondition(conditionId, type, rawValue, maxValue) {
    const value = type === 'check' ? (rawValue ? 1 : 0) : (parseInt(rawValue) || 0)
    const isDone = type === 'check' ? value >= 1 : (maxValue != null && value >= maxValue)
    const completedAt = isDone ? new Date().toISOString() : null
    const oldEntry = progress[conditionId]
    setProgress(prev => ({ ...prev, [conditionId]: { value, completed_at: completedAt } }))
    startTransition(async () => {
      const result = await upsertContentProgress(characterId, conditionId, value, completedAt)
      if (result?.error) {
        setProgress(prev => ({ ...prev, [conditionId]: oldEntry }))
        setError('저장 실패: ' + result.error)
      }
    })
  }

  const selectedContents = allContents.filter(c => selectedIds.has(c.id) && c.reset_type === activeCycle)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.4 }}>불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex gap-1 flex-1">
          {['daily', 'weekly'].map(c => {
            const count = allContents.filter(ct => selectedIds.has(ct.id) && ct.reset_type === c).length
            return (
              <button key={c} onClick={() => setActiveCycle(c)}
                className="px-3 rounded text-xs font-medium transition-colors"
                style={{
                  minHeight: '36px',
                  ...(activeCycle === c
                    ? { backgroundColor: 'var(--parchment)', color: 'var(--ink)', fontWeight: 600, border: '1.5px solid var(--gold)' }
                    : { color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.06)' })
                }}>
                {RESET_LABELS[c]} ({count})
              </button>
            )
          })}
        </div>
        <button onClick={() => setShowPicker(true)}
          className="btn-primary text-sm sm:text-xs w-full sm:w-auto px-4 sm:px-3 rounded font-medium flex-shrink-0"
          style={{ minHeight: '44px' }}>
          + 콘텐츠 선택
        </button>
      </div>

      {error && (
        <p className="text-xs rounded px-3 py-2 mb-2 flex-shrink-0"
          style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
          오류: {error}
        </p>
      )}

      {selectedContents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-4xl mb-2">🗺</div>
          <p className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.35 }}>
            진행할 {RESET_LABELS[activeCycle]} 콘텐츠를 선택하세요
          </p>
          <button onClick={() => setShowPicker(true)}
            className="btn-ghost mt-3 text-xs px-3 py-1.5 rounded">
            콘텐츠 선택하기
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {selectedContents.map(content => (
            <ContentCard
              key={content.id}
              content={content}
              progress={progress}
              onChangeCondition={handleChangeCondition}
              onRemove={() => handleToggle(content.id, true)}
            />
          ))}
        </div>
      )}

      {showPicker && (
        <ContentPickerModal
          allContents={allContents}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onClose={() => setShowPicker(false)}
          activeCycle={activeCycle}
        />
      )}
    </div>
  )
}
