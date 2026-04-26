'use client'

import { useState, useTransition } from 'react'
import { addQuest, updateQuest, deleteQuest } from '@/app/actions/admin'

const CATEGORIES = ['퀘스트', '아르바이트', '이벤트', '미션']
const SUB_CATEGORIES = {
  '퀘스트': ['메인', '사이드'],
  '아르바이트': [],
  '이벤트': [],
  '미션': ['일일', '주간', '길드'],
}

const EMPTY_SIMPLE = {
  structureType: 'simple',
  name: '', category: '퀘스트', sub_category: '', description: '', deadline: '',
  conditions: [], rewards: [],
}
const EMPTY_HIERARCHICAL = {
  structureType: 'hierarchical',
  name: '', category: '퀘스트', sub_category: '', description: '', deadline: '',
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

// ── 공용 서브컴포넌트 ─────────────────────────────────────

function ConditionEditor({ conditions, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-xs font-medium">조건 목록</span>
        <button type="button"
          onClick={() => onChange([...conditions, { name: '', type: 'check', max_value: '' }])}
          className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">
          + 추가
        </button>
      </div>
      <div className="space-y-1.5">
        {conditions.map((cond, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <input value={cond.name}
              onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
              placeholder="조건명"
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500" />
            <select value={cond.type}
              onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, type: e.target.value } : c))}
              className="bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
              <option value="check">체크</option>
              <option value="progress">진행도</option>
            </select>
            {cond.type === 'progress' && (
              <input type="number" value={cond.max_value} min={1} placeholder="목표"
                onChange={e => onChange(conditions.map((c, idx) => idx === i ? { ...c, max_value: parseInt(e.target.value) || '' } : c))}
                onFocus={e => e.target.select()}
                className="w-14 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center" />
            )}
            <button type="button"
              onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}
              className="text-slate-500 hover:text-red-400 text-xs px-1 py-1">✕</button>
          </div>
        ))}
        {conditions.length === 0 && <p className="text-slate-600 text-xs">조건 없음</p>}
      </div>
    </div>
  )
}

function RewardEditor({ rewards, items, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-xs font-medium">보상 목록</span>
        <button type="button"
          onClick={() => onChange([...rewards, { item_id: '', amount: 1 }])}
          className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">
          + 추가
        </button>
      </div>
      <div className="space-y-1.5">
        {rewards.map((r, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <select value={r.item_id}
              onChange={e => onChange(rewards.map((rw, idx) => idx === i ? { ...rw, item_id: e.target.value } : rw))}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
              <option value="">아이템 선택</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.emoji} {it.name}</option>)}
            </select>
            <input type="number" value={r.amount} min={1}
              onChange={e => onChange(rewards.map((rw, idx) => idx === i ? { ...rw, amount: parseInt(e.target.value) || 1 } : rw))}
              onFocus={e => e.target.select()}
              className="w-14 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center" />
            <button type="button"
              onClick={() => onChange(rewards.filter((_, idx) => idx !== i))}
              className="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 계층형 전용 서브컴포넌트 ─────────────────────────────

function MissionBlock({ mission, items, onChange, onDelete, index }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-slate-750 border border-slate-600/60 rounded" style={{ backgroundColor: '#1a2438' }}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-slate-500 text-xs w-3 flex-shrink-0 text-center">
          {open ? '▾' : '▸'}
        </button>
        <span className="text-slate-400 text-xs flex-1">미션 {index + 1}</span>
        <button type="button" onClick={onDelete}
          className="text-slate-500 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-700/50">
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
    <div className="bg-slate-800 border border-amber-900/40 rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-amber-700 text-xs w-3 flex-shrink-0 text-center">
          {open ? '▾' : '▸'}
        </button>
        <input value={section.name}
          onChange={e => onChange({ ...section, name: e.target.value })}
          placeholder="분류명 (예: 출석, 일일, 주간, 도전)"
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500" />
        <button type="button" onClick={onDelete}
          className="text-slate-500 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-amber-900/20 pt-2">
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
            <p className="text-slate-600 text-xs px-1">미션이 없습니다</p>
          )}
          <button type="button" onClick={addMission}
            className="w-full text-xs text-amber-500 hover:text-amber-400 border border-amber-800/30 hover:border-amber-700/50 rounded px-3 py-1.5 transition-colors">
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
    const base = { name: form.name, category: form.category, sub_category: form.sub_category, description: form.description }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-slate-800 border border-amber-900/50 rounded-lg shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/30">
          <h3 className="text-amber-300 font-semibold">{quest ? '퀘스트 수정' : '퀘스트 추가'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{error}</p>
          )}

          {/* 구조 타입 */}
          <div>
            <label className="block text-slate-300 text-xs mb-2">구조 타입</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'simple', label: '단순형', desc: '조건 달성 → 보상 지급' },
                { id: 'hierarchical', label: '계층형', desc: '분류 › 미션 › 조건/보상' },
              ].map(({ id, label, desc }) => (
                <button key={id} type="button"
                  onClick={() => handleStructureTypeChange(id)}
                  className={`text-left rounded px-3 py-2.5 border transition-colors ${
                    form.structureType === id
                      ? 'border-amber-600 bg-amber-900/20 text-amber-300'
                      : 'border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500'
                  }`}>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <div>
            <label className="block text-slate-300 text-xs mb-1">퀘스트명 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="퀘스트명"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 text-xs mb-1">카테고리</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-xs mb-1">세부 카테고리</label>
              <select value={form.sub_category} onChange={e => set('sub_category', e.target.value)}
                disabled={subCats.length === 0}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50">
                <option value="">없음</option>
                {subCats.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs mb-1">설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>

          <div>
            <label className="block text-slate-300 text-xs mb-1">마감 날짜</label>
            <input type="date" value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 [color-scheme:dark]" />
          </div>

          {/* 단순형 */}
          {form.structureType === 'simple' && (
            <>
              <ConditionEditor conditions={form.conditions} onChange={v => set('conditions', v)} />
              <RewardEditor rewards={form.rewards} items={items} onChange={v => set('rewards', v)} />
            </>
          )}

          {/* 계층형 */}
          {form.structureType === 'hierarchical' && (
            <div className="space-y-2">
              <label className="block text-slate-300 text-xs font-medium">분류 목록</label>
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
                <p className="text-slate-600 text-xs">분류가 없습니다</p>
              )}
              <button type="button" onClick={addSection}
                className="w-full text-xs text-amber-400 hover:text-amber-300 border border-amber-800/40 hover:border-amber-700/60 rounded px-3 py-2 transition-colors">
                + 분류 추가
              </button>
            </div>
          )}
        </form>

        <div className="flex gap-3 px-5 py-4 border-t border-amber-900/20">
          <button type="button" onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 rounded text-sm">취소</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 rounded text-sm">
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/20 flex-shrink-0">
        <div className="flex gap-1 flex-wrap">
          {['전체', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-amber-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}>{cat}</button>
          ))}
        </div>
        <button onClick={() => setModal('add')}
          className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded ml-2">
          + 퀘스트 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-700/40">
        {filtered.map(quest => (
          <div key={quest.id} className="px-5 py-3 hover:bg-slate-700/20 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-100 font-medium text-sm">{quest.name}</span>
                  <span className="text-xs text-amber-600 bg-amber-900/20 border border-amber-800/30 px-1.5 py-0.5 rounded">
                    {quest.category}{quest.sub_category ? ` · ${quest.sub_category}` : ''}
                  </span>
                  {quest.structure_type === 'hierarchical' && (
                    <span className="text-xs text-slate-500 bg-slate-700/40 border border-slate-700 px-1.5 py-0.5 rounded">
                      계층형 · {(quest.quest_sections ?? []).length}분류
                    </span>
                  )}
                  {quest.deadline && (
                    <span className="text-xs text-slate-500">
                      {formatDeadline(quest.deadline)}
                      {isExpired(quest.deadline) && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded bg-red-900/20 border border-red-800/40 text-red-400">마감</span>
                      )}
                    </span>
                  )}
                </div>
                {quest.description && (
                  <p className="text-slate-500 text-xs mt-1">{quest.description}</p>
                )}
                {quest.structure_type !== 'hierarchical' && (quest.quest_conditions ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(quest.quest_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order).map(c => (
                      <span key={c.id} className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                        {c.type === 'check' ? '☐' : '◫'} {c.name}{c.max_value ? ` (${c.max_value})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setModal(quest)}
                  className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/40 px-2 py-1 rounded">수정</button>
                <button onClick={() => handleDelete(quest.id)}
                  className="text-xs text-slate-400 hover:text-red-400 border border-slate-600/40 px-2 py-1 rounded">삭제</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-600 text-sm">퀘스트가 없습니다</div>
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
