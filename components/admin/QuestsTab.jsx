'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addQuest, updateQuest, deleteQuest } from '@/app/actions/admin'
import ResetFields from './ResetFields'

const CATEGORIES = ['퀘스트', '아르바이트', '이벤트', '미션']
const SUB_CATEGORIES = {
  '퀘스트': ['메인', '사이드'],
  '아르바이트': [],
  '이벤트': [],
  '미션': ['일일', '주간', '길드'],
}

const RESET_DEFAULTS = { reset_type: 'none', reset_day: null, reset_hour: 6 }
const SCOPE_DEFAULT = { scope: 'character' }

const EMPTY_SIMPLE = {
  structureType: 'simple',
  name: '', category: '퀘스트', sub_category: '', description: '', deadline: '',
  ...RESET_DEFAULTS,
  ...SCOPE_DEFAULT,
  conditions: [], rewards: [],
}
const EMPTY_HIERARCHICAL = {
  structureType: 'hierarchical',
  name: '', category: '퀘스트', sub_category: '', description: '', deadline: '',
  ...RESET_DEFAULTS,
  ...SCOPE_DEFAULT,
  sections: [],
}

function formatDeadline(deadline) {
  if (!deadline) return null
  const [y, m, d] = deadline.split('-')
  return `~${y}.${m}.${d}`
}

function isExpired(deadline) {
  if (!deadline) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(deadline + 'T00:00:00') < today
}

function hasUnsavedContent(form) {
  if (form.structureType === 'simple') return form.conditions.length > 0 || form.rewards.length > 0
  return (form.sections ?? []).length > 0
}

// ── 아이템 검색 셀렉트 ───────────────────────────────────

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
        className="input-field w-full rounded px-2 py-1 text-xs"
      />
      {editing && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
          {filtered.map(opt => (
            <li key={opt.value}>
              <button type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(opt); setEditing(false); setQuery('') }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
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

// ── 공용 서브컴포넌트 ─────────────────────────────────────

function ConditionEditor({ conditions, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--gold-dark)' }}>조건 목록</span>
        <button type="button"
          onClick={() => onChange([...conditions, { name: '', type: 'check', max_value: '' }])}
          className="btn-ghost-sm px-2 py-0.5 rounded">+ 추가</button>
      </div>
      <div className="space-y-1.5">
        {conditions.map((cond, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <input value={cond.name}
              onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
              placeholder="조건명"
              className="input-field flex-1 rounded px-2 py-1 text-xs" />
            <select value={cond.type}
              onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, type: e.target.value } : c))}
              className="input-field rounded px-1.5 py-1 text-xs">
              <option value="check">체크</option>
              <option value="progress">진행도</option>
            </select>
            {cond.type === 'progress' && (
              <input type="number" value={cond.max_value} min={1} placeholder="목표"
                onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, max_value: parseInt(e.target.value) || '' } : c))}
                onFocus={e => e.target.select()}
                className="input-field w-14 rounded px-1.5 py-1 text-xs text-center" />
            )}
            <button type="button"
              onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}
              className="text-xs px-1 py-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--crimson-light)' }}>✕</button>
          </div>
        ))}
        {conditions.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>조건 없음</p>
        )}
      </div>
    </div>
  )
}

function RewardEditor({ rewards, items, onChange }) {
  const itemOptions = items.map(i => ({ value: i.id, label: i.name, emoji: i.emoji }))

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--gold-dark)' }}>보상 목록</span>
        <button type="button"
          onClick={() => onChange([...rewards, { item_id: '', amount: 1 }])}
          className="btn-ghost-sm px-2 py-0.5 rounded">+ 추가</button>
      </div>
      <div className="space-y-1.5">
        {rewards.map((r, i) => {
          const item = items.find(it => it.id === r.item_id)
          return (
            <div key={i} className="flex gap-1.5 items-center">
              <SearchSelect
                selectedLabel={item ? `${item.emoji} ${item.name}` : ''}
                onSelect={opt => onChange(rewards.map((rw, idx) => idx === i ? { ...rw, item_id: opt.value } : rw))}
                options={itemOptions}
                placeholder="아이템 검색..."
                className="flex-1"
              />
              <input type="number" value={r.amount} min={1}
                onChange={e => onChange(rewards.map((rw, idx) => idx === i ? { ...rw, amount: parseInt(e.target.value) || 1 } : rw))}
                onFocus={e => e.target.select()}
                className="input-field w-14 rounded px-1.5 py-1 text-xs text-center" />
              <button type="button"
                onClick={() => onChange(rewards.filter((_, idx) => idx !== i))}
                className="text-xs px-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--crimson-light)' }}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 계층형 전용 서브컴포넌트 ─────────────────────────────

function MissionBlock({ mission, items, onChange, onDelete, index }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded" style={{ backgroundColor: 'var(--parchment)', border: '1px solid rgba(138,106,31,0.3)' }}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-xs w-3 flex-shrink-0 text-center transition-opacity hover:opacity-70"
          style={{ color: 'var(--gold-dark)' }}>
          {open ? '▾' : '▸'}
        </button>
        <span className="text-xs flex-1 font-medium" style={{ color: 'var(--ink)', opacity: 0.7 }}>미션 {index + 1}</span>
        <button type="button" onClick={onDelete}
          className="text-xs px-1 flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: 'var(--crimson-light)' }}>✕</button>
      </div>

      {open && (
        <div
          className="px-3 pb-3 pt-1 space-y-3"
          style={{ borderTop: '1px solid rgba(138,106,31,0.2)' }}
        >
          <ConditionEditor
            conditions={mission.conditions}
            onChange={conditions => onChange({ ...mission, conditions })}
          />
          <RewardEditor
            rewards={mission.rewards}
            items={items}
            onChange={rewards => onChange({ ...mission, rewards })}
          />
        </div>
      )}
    </div>
  )
}

function SectionBlock({ section, items, onChange, onDelete }) {
  const [open, setOpen] = useState(true)

  function addMission() {
    onChange({
      ...section,
      missions: [...section.missions, { _key: crypto.randomUUID(), name: '', conditions: [], rewards: [] }],
    })
  }

  return (
    <div className="rounded-lg" style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-xs w-3 flex-shrink-0 text-center transition-opacity hover:opacity-70"
          style={{ color: 'var(--gold)' }}>
          {open ? '▾' : '▸'}
        </button>
        <input value={section.name}
          onChange={e => onChange({ ...section, name: e.target.value })}
          placeholder="분류명 (예: 출석, 일일, 주간, 도전)"
          className="input-field flex-1 rounded px-2 py-1.5 text-sm" />
        <button type="button" onClick={onDelete}
          className="text-xs px-1 flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: 'var(--crimson-light)' }}>✕</button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2 pt-2" style={{ borderTop: '1px solid rgba(201,168,76,0.25)' }}>
          {section.missions.map((mission, i) => (
            <MissionBlock
              key={mission._key}
              mission={mission}
              items={items}
              index={i}
              onChange={updated => onChange({
                ...section,
                missions: section.missions.map((m, idx) => idx === i ? updated : m),
              })}
              onDelete={() => onChange({
                ...section,
                missions: section.missions.filter((_, idx) => idx !== i),
              })}
            />
          ))}
          {section.missions.length === 0 && (
            <p className="text-xs px-1" style={{ color: 'var(--ink)', opacity: 0.4 }}>미션이 없습니다</p>
          )}
          <button type="button" onClick={addMission}
            className="btn-ghost w-full text-xs rounded px-3 py-1.5">
            + 미션 추가
          </button>
        </div>
      )}
    </div>
  )
}

// ── QuestModal ────────────────────────────────────────────

function QuestModal({ quest, items, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    if (!quest) return EMPTY_SIMPLE
    const base = {
      structureType: quest.structure_type ?? 'simple',
      name: quest.name,
      category: quest.category,
      sub_category: quest.sub_category ?? '',
      description: quest.description ?? '',
      deadline: quest.deadline ?? '',
      reset_type: quest.reset_type ?? 'none',
      reset_day: quest.reset_day ?? null,
      reset_hour: quest.reset_hour ?? 6,
      scope: quest.scope ?? 'character',
    }
    if (base.structureType === 'hierarchical') {
      return {
        ...base,
        sections: (quest.quest_sections ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(s => ({
            id: s.id, _key: s.id, name: s.name,
            missions: (s.quest_section_missions ?? [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(m => ({
                id: m.id, _key: m.id, name: m.name,
                conditions: (m.quest_mission_conditions ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map(c => ({ name: c.name, type: c.type, max_value: c.max_value ?? '' })),
                rewards: (m.quest_mission_rewards ?? []).map(r => ({ item_id: r.item_id, amount: r.amount })),
              })),
          })),
      }
    }
    return {
      ...base,
      conditions: (quest.quest_conditions ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ name: c.name, type: c.type, max_value: c.max_value ?? '' })),
      rewards: (quest.quest_rewards ?? []).map(r => ({ item_id: r.item_id, amount: r.amount })),
    }
  })

  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const subCats = SUB_CATEGORIES[form.category] ?? []

  function handleStructureTypeChange(newType) {
    if (form.structureType === newType) return
    if (hasUnsavedContent(form) && !confirm('전환 시 입력 내용이 초기화됩니다. 계속할까요?')) return
    const base = { name: form.name, category: form.category, sub_category: form.sub_category, description: form.description, deadline: form.deadline ?? '' }
    setForm(newType === 'simple'
      ? { ...base, structureType: 'simple', conditions: [], rewards: [] }
      : { ...base, structureType: 'hierarchical', sections: [] }
    )
  }

  function addSection() {
    set('sections', [...(form.sections ?? []), {
      _key: crypto.randomUUID(), name: '', missions: [],
    }])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('퀘스트명을 입력해주세요')
    setError(null)

    const base = {
      name: form.name.trim(),
      category: form.category,
      sub_category: form.sub_category,
      description: form.description,
      deadline: form.deadline || null,
      structure_type: form.structureType,
      reset_type: form.reset_type,
      reset_day: form.reset_day ?? null,
      reset_hour: form.reset_hour ?? 6,
      scope: form.scope ?? 'character',
    }

    const data = form.structureType === 'simple'
      ? {
          ...base,
          conditions: form.conditions.filter(c => c.name.trim()),
          rewards: form.rewards.filter(r => r.item_id),
        }
      : {
          ...base,
          sections: (form.sections ?? [])
            .filter(s => s.name.trim())
            .map((s, si) => ({
              name: s.name.trim(),
              sort_order: si,
              missions: (s.missions ?? [])
                .map((m, mi) => ({
                  name: '',
                  sort_order: mi,
                  conditions: m.conditions.filter(c => c.name.trim()),
                  rewards: m.rewards.filter(r => r.item_id),
                })),
            })),
        }

    startTransition(async () => {
      const result = quest ? await updateQuest(quest.id, data) : await addQuest(data)
      if (result.error) setError(result.error)
      else onSave(result.quest)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>
            ✦ {quest ? '퀘스트 수정' : '퀘스트 추가'}
          </h3>
          <button onClick={onClose}
            className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{
              background: 'rgba(139,32,32,0.1)',
              border: '1px solid var(--crimson)',
              color: 'var(--crimson-light)',
            }}>{error}</p>
          )}

          {/* 구조 타입 */}
          <div>
            <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--ink)' }}>구조 타입</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'simple', label: '단순형', desc: '조건 달성 → 보상 지급' },
                { id: 'hierarchical', label: '계층형', desc: '분류 › 미션 › 조건/보상' },
              ].map(({ id, label, desc }) => (
                <button key={id} type="button"
                  onClick={() => handleStructureTypeChange(id)}
                  className="text-left rounded px-3 py-2.5 transition-colors"
                  style={form.structureType === id
                    ? { border: '1.5px solid var(--gold)', backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--gold-dark)' }
                    : { border: '1px solid rgba(138,106,31,0.3)', backgroundColor: 'var(--parchment-dark)', color: 'var(--ink)' }
                  }>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs mt-0.5" style={{ opacity: 0.55 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>퀘스트명 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="퀘스트명"
              className="input-field w-full rounded px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>카테고리</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="input-field w-full rounded px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>세부 카테고리</label>
              <select value={form.sub_category} onChange={e => set('sub_category', e.target.value)}
                disabled={subCats.length === 0}
                className="input-field w-full rounded px-3 py-2 text-sm">
                <option value="">없음</option>
                {subCats.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="input-field w-full rounded px-3 py-2 text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>마감 날짜</label>
            <input type="date" value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
              className="input-field rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--ink)' }}>완료 범위</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'character', label: '캐릭터별', desc: '캐릭터마다 개별 완료 처리' },
                { id: 'server', label: '서버별', desc: '서버 내 1개 완료 시 공유' },
              ].map(({ id, label, desc }) => (
                <button key={id} type="button"
                  onClick={() => set('scope', id)}
                  className="text-left rounded px-3 py-2.5 transition-colors"
                  style={form.scope === id
                    ? { border: '1.5px solid var(--gold)', backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--gold-dark)' }
                    : { border: '1px solid rgba(138,106,31,0.3)', backgroundColor: 'var(--parchment-dark)', color: 'var(--ink)' }
                  }>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs mt-0.5" style={{ opacity: 0.55 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--ink)' }}>초기화 설정</label>
            <ResetFields
              resetType={form.reset_type}
              resetDay={form.reset_day}
              resetHour={form.reset_hour}
              onChange={(k, v) => set(k, v)}
            />
          </div>

          {form.structureType === 'simple' && (
            <>
              <ConditionEditor conditions={form.conditions} onChange={v => set('conditions', v)} />
              <RewardEditor rewards={form.rewards} items={items} onChange={v => set('rewards', v)} />
            </>
          )}

          {form.structureType === 'hierarchical' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold font-serif" style={{ color: 'var(--gold-dark)' }}>✦ 분류 목록</label>
              {(form.sections ?? []).map((section, i) => (
                <SectionBlock
                  key={section._key}
                  section={section}
                  items={items}
                  onChange={updated => set('sections', form.sections.map((s, idx) => idx === i ? updated : s))}
                  onDelete={() => set('sections', form.sections.filter((_, idx) => idx !== i))}
                />
              ))}
              {(form.sections ?? []).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>분류가 없습니다</p>
              )}
              <button type="button" onClick={addSection}
                className="btn-ghost w-full text-xs rounded px-3 py-2">
                + 분류 추가
              </button>
            </div>
          )}
        </form>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
          <button type="button" onClick={onClose}
            className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="btn-primary flex-1 py-2 rounded text-sm">
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── QuestsTab ─────────────────────────────────────────────

export default function QuestsTab({ quests, setQuests, items }) {
  const [modal, setModal] = useState(null)
  const [filterCategory, setFilterCategory] = useState('전체')
  const [isPending, startTransition] = useTransition()

  function handleSave(quest) {
    setQuests(prev => {
      const idx = prev.findIndex(q => q.id === quest.id)
      return idx >= 0 ? prev.map(q => q.id === quest.id ? quest : q) : [...prev, quest]
    })
    setModal(null)
  }

  function handleDelete(id) {
    if (!confirm('퀘스트를 삭제할까요?')) return
    startTransition(async () => {
      const result = await deleteQuest(id)
      if (!result.error) setQuests(prev => prev.filter(q => q.id !== id))
    })
  }

  const filtered = filterCategory === '전체' ? quests : quests.filter(q => q.category === filterCategory)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 md:px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}
      >
        <div className="flex gap-1 flex-wrap flex-1">
          {['전체', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className="px-3 rounded text-xs font-medium transition-colors"
              style={{
                minHeight: '36px',
                ...(filterCategory === cat
                  ? { backgroundColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }
                  : { color: 'var(--gold-dark)', border: '1px solid var(--gold)', background: 'transparent' })
              }}>{cat}</button>
          ))}
        </div>
        <button onClick={() => setModal('add')}
          className="btn-primary text-sm w-full sm:w-auto px-4 sm:px-3 rounded flex-shrink-0"
          style={{ minHeight: '44px' }}>
          + 퀘스트 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto dots-bg">
        {filtered.map((quest, idx) => (
          <div
            key={quest.id}
            className="px-5 py-3 transition-colors hover:bg-[rgba(201,168,76,0.05)]"
            style={{ borderBottom: '1px solid rgba(138,106,31,0.15)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{quest.name}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--gold-dark)', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)' }}
                  >
                    {quest.category}{quest.sub_category ? ` · ${quest.sub_category}` : ''}
                  </span>
                  {quest.structure_type === 'hierarchical' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--ink)', opacity: 0.55, border: '1px solid rgba(138,106,31,0.3)', background: 'rgba(45,31,10,0.06)' }}
                    >
                      계층형 · {(quest.quest_sections ?? []).length}분류
                    </span>
                  )}
                  {quest.scope === 'server' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(74,124,95,0.12)', color: 'var(--sage)', border: '1px solid rgba(74,124,95,0.3)' }}
                    >
                      서버 공유
                    </span>
                  )}
                  {quest.deadline && (
                    <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.5 }}>
                      {formatDeadline(quest.deadline)}
                      {isExpired(quest.deadline) && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded"
                          style={{ background: 'rgba(139,32,32,0.12)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
                          마감
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {quest.description && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink)', opacity: 0.5 }}>{quest.description}</p>
                )}
                {quest.structure_type !== 'hierarchical' && (quest.quest_conditions ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(quest.quest_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order).map(c => (
                      <span key={c.id}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ color: 'var(--ink)', opacity: 0.6, background: 'rgba(138,106,31,0.1)', border: '1px solid rgba(138,106,31,0.2)' }}
                      >
                        {c.type === 'check' ? '☐' : '◫'} {c.name}{c.max_value ? ` (${c.max_value})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setModal(quest)}
                  className="btn-ghost-sm px-2 py-1 rounded">수정</button>
                <button onClick={() => handleDelete(quest.id)}
                  className="btn-danger text-xs px-2 py-1 rounded">삭제</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>
            퀘스트가 없습니다
          </div>
        )}
      </div>

      {modal && (
        <QuestModal
          quest={modal === 'add' ? null : modal}
          items={items}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
