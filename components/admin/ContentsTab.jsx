'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addContent, updateContent, deleteContent } from '@/app/actions/contents'

const CYCLE_LABELS = { daily: '일일', weekly: '주간' }
const COND_TYPE_LABELS = { check: '체크', progress: '진행도' }

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

function ContentModal({ content, items, onSave, onClose }) {
  const [form, setForm] = useState({
    name: content?.name ?? '',
    reset_cycle: content?.reset_cycle ?? 'daily',
    sort_order: content?.sort_order ?? 0,
  })
  const [conditions, setConditions] = useState(
    content?.content_conditions
      ? [...content.content_conditions].sort((a, b) => a.sort_order - b.sort_order).map(c => ({
          name: c.name, type: c.type, max_value: c.max_value ?? '',
        }))
      : []
  )
  const [rewards, setRewards] = useState(
    content?.content_rewards
      ? content.content_rewards.map(r => ({ item_id: r.item_id, amount: r.amount }))
      : []
  )
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function addCondition() {
    setConditions(prev => [...prev, { name: '', type: 'check', max_value: '' }])
  }
  function removeCondition(i) {
    setConditions(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateCondition(i, field, value) {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function addReward() {
    setRewards(prev => [...prev, { item_id: '', amount: 1 }])
  }
  function removeReward(i) {
    setRewards(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateReward(i, field, value) {
    setRewards(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  const itemOptions = items.map(i => ({ value: i.id, label: i.name, emoji: i.emoji }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('콘텐츠 이름을 입력해 주세요')
    const validConds = conditions.filter(c => c.name.trim())
    for (const c of validConds) {
      if (c.type === 'progress' && (!c.max_value || isNaN(Number(c.max_value)))) {
        return setError('진행도 조건의 목표 수치를 입력해 주세요')
      }
    }
    const validRewards = rewards.filter(r => r.item_id)
    setError(null)
    startTransition(async () => {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
        conditions: validConds.map(c => ({
          name: c.name.trim(),
          type: c.type,
          max_value: c.type === 'progress' ? Number(c.max_value) : null,
        })),
        rewards: validRewards.map(r => ({ item_id: r.item_id, amount: Number(r.amount) || 1 })),
      }
      const result = content ? await updateContent(content.id, payload) : await addContent(payload)
      if (result.error) return setError(result.error)
      onSave(result.content)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}>
          <h2 className="font-serif font-semibold tracking-wide" style={{ color: 'var(--gold-dark)' }}>
            ✦ {content ? '콘텐츠 수정' : '콘텐츠 추가'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm rounded px-3 py-2"
              style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
              {error}
            </p>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>콘텐츠 이름 *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input-field w-full rounded px-3 py-2 text-sm" placeholder="예: 세계수의 빛" />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>정렬 순서</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)}
                onFocus={e => e.target.select()}
                min={0} className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--ink)' }}>초기화 주기</label>
            <div className="flex gap-4">
              {['daily', 'weekly'].map(c => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="reset_cycle" value={c}
                    checked={form.reset_cycle === c} onChange={() => set('reset_cycle', c)}
                    style={{ accentColor: 'var(--sage)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{CYCLE_LABELS[c]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 조건 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>조건</label>
              <button type="button" onClick={addCondition}
                className="btn-ghost-sm text-xs px-2 py-1 rounded">+ 조건 추가</button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs py-2" style={{ color: 'var(--ink)', opacity: 0.4 }}>조건이 없습니다</p>
            )}
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input value={cond.name} onChange={e => updateCondition(i, 'name', e.target.value)}
                      placeholder="조건명" className="input-field rounded px-2 py-1.5 text-sm" />
                    <div className="flex gap-2">
                      <select value={cond.type} onChange={e => updateCondition(i, 'type', e.target.value)}
                        className="input-field flex-1 rounded px-2 py-1.5 text-sm">
                        <option value="check">체크</option>
                        <option value="progress">진행도</option>
                      </select>
                      {cond.type === 'progress' && (
                        <input type="number" value={cond.max_value}
                          onChange={e => updateCondition(i, 'max_value', e.target.value)}
                          onFocus={e => e.target.select()}
                          placeholder="목표" min={1} className="input-field w-16 rounded px-2 py-1.5 text-sm text-center" />
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeCondition(i)}
                    className="text-xs mt-2 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--crimson-light)' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* 보상 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>보상</label>
              <button type="button" onClick={addReward}
                className="btn-ghost-sm text-xs px-2 py-1 rounded">+ 보상 추가</button>
            </div>
            {rewards.length === 0 && (
              <p className="text-xs py-2" style={{ color: 'var(--ink)', opacity: 0.4 }}>보상이 없습니다</p>
            )}
            <div className="space-y-2">
              {rewards.map((reward, i) => {
                const item = items.find(it => it.id === reward.item_id)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <SearchSelect
                      selectedLabel={item ? `${item.emoji} ${item.name}` : ''}
                      onSelect={opt => updateReward(i, 'item_id', opt.value)}
                      options={itemOptions}
                      placeholder="아이템 검색..."
                      className="flex-1"
                    />
                    <input type="number" value={reward.amount}
                      onChange={e => updateReward(i, 'amount', e.target.value)}
                      onFocus={e => e.target.select()}
                      min={1} className="input-field w-16 rounded px-2 py-1.5 text-sm text-center" />
                    <button type="button" onClick={() => removeReward(i)}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--crimson-light)' }}>✕</button>
                  </div>
                )
              })}
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

export default function ContentsTab({ contents, setContents, items }) {
  const [modal, setModal] = useState(null)
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState(null)
  const [activeTab, setActiveTab] = useState('daily')

  const filtered = contents.filter(c => c.reset_cycle === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  function handleSave(content) {
    setContents(prev => {
      const exists = prev.find(c => c.id === content.id)
      return exists ? prev.map(c => c.id === content.id ? content : c) : [...prev, content]
    })
    setModal(null)
  }

  function handleDelete(content) {
    if (!confirm(`"${content.name}" 콘텐츠를 삭제할까요?`)) return
    setDeletingId(content.id)
    startTransition(async () => {
      const result = await deleteContent(content.id)
      if (!result.error) setContents(prev => prev.filter(c => c.id !== content.id))
      setDeletingId(null)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <div className="flex gap-1">
          {['daily', 'weekly'].map(c => (
            <button key={c} onClick={() => setActiveTab(c)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === c ? 'btn-primary' : 'btn-ghost-sm'}`}>
              {CYCLE_LABELS[c]} ({contents.filter(ct => ct.reset_cycle === c).length})
            </button>
          ))}
        </div>
        <button onClick={() => setModal('add')} className="btn-primary text-xs px-3 py-1.5 rounded">+ 추가</button>
      </div>

      <div className="flex-1 overflow-y-auto dots-bg p-4 space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--ink)', opacity: 0.35 }}>
            등록된 {CYCLE_LABELS[activeTab]} 콘텐츠가 없습니다
          </p>
        )}

        {filtered.map(content => {
          const conds = [...(content.content_conditions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const rewardsList = content.content_rewards ?? []
          return (
            <div key={content.id} className="panel rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-3"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.2)', backgroundColor: 'rgba(201,168,76,0.06)' }}>
                <span className="font-serif font-semibold text-sm flex-1" style={{ color: 'var(--gold-dark)' }}>
                  {content.name}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  {CYCLE_LABELS[content.reset_cycle]}
                </span>
                <button onClick={() => setModal(content)} className="btn-ghost-sm px-2 py-1 rounded text-xs">수정</button>
                <button onClick={() => handleDelete(content)} disabled={deletingId === content.id}
                  className="btn-danger text-xs px-2 py-1 rounded">
                  {deletingId === content.id ? '...' : '삭제'}
                </button>
              </div>
              <div className="px-4 py-3 space-y-2">
                {conds.length > 0 && (
                  <div className="space-y-1">
                    {conds.map(cond => (
                      <div key={cond.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink)' }}>
                        <span className="px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(74,124,95,0.1)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.25)', fontSize: '10px' }}>
                          {COND_TYPE_LABELS[cond.type]}
                        </span>
                        <span className="flex-1">{cond.name}</span>
                        {cond.type === 'progress' && cond.max_value != null && (
                          <span style={{ opacity: 0.5 }}>/{cond.max_value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {rewardsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5" style={{ borderTop: conds.length ? '1px solid rgba(138,106,31,0.15)' : 'none' }}>
                    {rewardsList.map(r => (
                      <span key={r.id} className="text-xs px-2 py-0.5 rounded"
                        style={{ color: 'var(--gold-dark)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        {r.items?.emoji} {r.items?.name} ×{r.amount}
                      </span>
                    ))}
                  </div>
                )}
                {conds.length === 0 && rewardsList.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.35 }}>조건 및 보상 없음</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <ContentModal
          content={modal === 'add' ? null : modal}
          items={items}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
