'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase'
import { upsertProgress, addCharacterQuest, removeCharacterQuest } from '@/app/actions/quests'

const CATEGORY_ORDER = ['퀘스트', '아르바이트', '이벤트', '미션']

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

const QUEST_SELECT = `
  *,
  quest_conditions(id, name, type, max_value, sort_order),
  quest_rewards(id, item_id, amount, items(name, emoji)),
  quest_sections(
    id, name, sort_order,
    quest_section_missions(
      id, name, sort_order,
      quest_mission_conditions(id, name, type, max_value, sort_order),
      quest_mission_rewards(id, item_id, amount, items(name, emoji))
    )
  )
`.trim()

function isCondDone(cond, progress) {
  const val = progress[cond.id] ?? 0
  return cond.type === 'check' ? val >= 1 : cond.max_value != null && val >= cond.max_value
}

function isMissionDone(mission, progress) {
  const conds = mission.quest_mission_conditions ?? []
  return conds.length > 0 && conds.every(c => isCondDone(c, progress))
}

function isSectionDone(section, progress) {
  const missions = section.quest_section_missions ?? []
  return missions.length > 0 && missions.every(m => isMissionDone(m, progress))
}

function isQuestDone(quest, progress) {
  if (quest.structure_type === 'hierarchical') {
    const sections = quest.quest_sections ?? []
    return sections.length > 0 && sections.every(s => isSectionDone(s, progress))
  }
  const conds = quest.quest_conditions ?? []
  return conds.length > 0 && conds.every(c => isCondDone(c, progress))
}

// ── 조건 단일 행 ──────────────────────────────────────────

function ConditionRow({ cond, progress, onChange }) {
  const val = progress[cond.id] ?? 0
  const done = isCondDone(cond, progress)
  return (
    <div className="flex items-center gap-3">
      {cond.type === 'check' ? (
        <input type="checkbox" checked={val >= 1}
          onChange={e => onChange(cond.id, 'check', e.target.checked)}
          className="w-4 h-4 flex-shrink-0"
          style={{ accentColor: 'var(--sage)' }} />
      ) : (
        <input type="number" value={val} min={0} max={cond.max_value ?? undefined}
          onChange={e => onChange(cond.id, 'progress', e.target.value)}
          onFocus={e => e.target.select()}
          className="input-field w-16 rounded px-2 py-0.5 text-xs text-center flex-shrink-0" />
      )}
      <span
        className="text-xs flex-1"
        style={{
          color: done ? 'var(--sage)' : 'var(--ink)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.7 : 1,
        }}
      >
        {cond.name}
      </span>
      {cond.type === 'progress' && cond.max_value != null && (
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink)', opacity: 0.45 }}>
          / {cond.max_value}
        </span>
      )}
    </div>
  )
}

function RewardBadges({ rewards }) {
  if (!rewards?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(138,106,31,0.2)' }}>
      {rewards.map(r => (
        <span key={r.id}
          className="text-xs px-2 py-0.5 rounded"
          style={{
            color: 'var(--gold-dark)',
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.35)',
          }}
        >
          {r.items?.emoji} {r.items?.name} ×{r.amount}
        </span>
      ))}
    </div>
  )
}

// ── 계층형 서브컴포넌트 ───────────────────────────────────

function MissionDisplay({ mission, progress, onChange }) {
  const conditions = (mission.quest_mission_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const done = isMissionDone(mission, progress)

  return (
    <div
      className="rounded p-2.5 space-y-2 transition-colors"
      style={{
        border: `1px solid ${done ? 'rgba(74,124,95,0.4)' : 'rgba(138,106,31,0.2)'}`,
        backgroundColor: done ? 'rgba(74,124,95,0.06)' : 'rgba(245,237,214,0.5)',
      }}
    >
      {conditions.map(cond => (
        <ConditionRow key={cond.id} cond={cond} progress={progress} onChange={onChange} />
      ))}
      <RewardBadges rewards={mission.quest_mission_rewards} />
    </div>
  )
}

function SectionDisplay({ section, progress, onChange }) {
  const [open, setOpen] = useState(true)
  const missions = (section.quest_section_missions ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const done = isSectionDone(section, progress)
  const doneCount = missions.filter(m => isMissionDone(m, progress)).length

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(138,106,31,0.35)' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-[rgba(201,168,76,0.08)]"
        style={{ backgroundColor: 'var(--parchment-dark)' }}
      >
        <span
          className="text-xs font-semibold font-serif"
          style={{ color: done ? 'var(--sage)' : 'var(--gold-dark)' }}
        >
          {done && '✓ '}{section.name}
        </span>
        <div className="flex items-center gap-2">
          {missions.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.45 }}>
              {doneCount}/{missions.length}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--gold-dark)' }}>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="p-2 space-y-2" style={{ backgroundColor: 'rgba(245,237,214,0.6)' }}>
          {missions.map(mission => (
            <MissionDisplay key={mission.id} mission={mission} progress={progress} onChange={onChange} />
          ))}
          {missions.length === 0 && (
            <p className="text-xs px-1 py-1" style={{ color: 'var(--ink)', opacity: 0.4 }}>미션이 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── 퀘스트 카드 ───────────────────────────────────────────

function QuestCard({ quest, progress, onChangeCondition, onRemove }) {
  const done = isQuestDone(quest, progress)
  const isHierarchical = quest.structure_type === 'hierarchical'

  const simpleConditions = (quest.quest_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const simpleDone = simpleConditions.filter(c => isCondDone(c, progress)).length

  const sections = (quest.quest_sections ?? []).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      className="panel dots-bg rounded-lg p-3 transition-colors"
      style={done ? { borderColor: 'var(--sage)', boxShadow: '0 2px 12px rgba(74,124,95,0.2)' } : {}}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="font-medium text-sm"
            style={{ color: done ? 'var(--sage)' : 'var(--ink)' }}
          >
            {done && '✓ '}{quest.name}
          </span>
          {quest.deadline && (
            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.45 }}>
              {formatDeadline(quest.deadline)}
              {isExpired(quest.deadline) && (
                <span
                  className="ml-1 text-xs px-1 py-0.5 rounded"
                  style={{ background: 'rgba(139,32,32,0.12)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}
                >마감</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isHierarchical && simpleConditions.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.45 }}>
              {simpleDone}/{simpleConditions.length}
            </span>
          )}
          <button onClick={onRemove} title="목록에서 제거"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--crimson-light)' }}>✕</button>
        </div>
      </div>

      {/* 단순형 */}
      {!isHierarchical && (
        <>
          {simpleConditions.length > 0 && (
            <div className="space-y-2">
              {simpleConditions.map(cond => (
                <ConditionRow key={cond.id} cond={cond} progress={progress} onChange={onChangeCondition} />
              ))}
            </div>
          )}
          <RewardBadges rewards={quest.quest_rewards} />
        </>
      )}

      {/* 계층형 */}
      {isHierarchical && (
        <div className="space-y-2">
          {sections.map(section => (
            <SectionDisplay key={section.id} section={section} progress={progress} onChange={onChangeCondition} />
          ))}
          {sections.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.4 }}>분류가 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── 퀘스트 선택 모달 ──────────────────────────────────────

function QuestPickerModal({ allQuests, selectedIds, onToggle, onClose }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0])
  const [search, setSearch] = useState('')

  const categories = CATEGORY_ORDER.filter(cat => allQuests.some(q => q.category === cat))
  const filtered = allQuests.filter(q =>
    q.category === activeCategory &&
    (!search.trim() || q.name.includes(search.trim()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[88vh] sm:max-h-[80vh] flex flex-col">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>✦ 퀘스트 선택</h3>
          <button onClick={onClose}
            className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <div className="px-5 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="퀘스트 검색..."
            className="input-field w-full rounded px-3 py-1.5 text-sm" />
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={activeCategory === cat
                  ? { backgroundColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }
                  : { color: 'var(--gold-dark)', border: '1px solid var(--gold)', background: 'transparent' }
                }>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(quest => {
            const isSelected = selectedIds.has(quest.id)
            return (
              <div
                key={quest.id}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[rgba(201,168,76,0.06)]"
                style={{ borderBottom: '1px solid rgba(138,106,31,0.12)' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{quest.name}</span>
                  {quest.sub_category && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--ink)', opacity: 0.45 }}>
                      {quest.sub_category}
                    </span>
                  )}
                  {quest.structure_type === 'hierarchical' && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--ink)', opacity: 0.35 }}>계층형</span>
                  )}
                </div>
                <button onClick={() => onToggle(quest.id, isSelected)}
                  className={`ml-3 text-xs px-3 py-1 rounded flex-shrink-0 transition-colors ${isSelected ? 'btn-danger' : 'btn-primary'}`}>
                  {isSelected ? '제거' : '추가'}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>
              퀘스트가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── QuestsPanel ───────────────────────────────────────────

export default function QuestsPanel({ characterId }) {
  const [allQuests, setAllQuests] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('퀘스트')
  const [showPicker, setShowPicker] = useState(false)
  const [toggleError, setToggleError] = useState(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!characterId) return
    setLoading(true)
    async function fetchData() {
      const supabase = createClient()
      const [{ data: questData }, { data: selectedData }, { data: progressData }] = await Promise.all([
        supabase.from('quests').select(QUEST_SELECT).order('name'),
        supabase.from('character_quests').select('quest_id').eq('character_id', characterId),
        supabase.from('quest_progress').select('condition_id, value').eq('character_id', characterId),
      ])
      setAllQuests(questData ?? [])
      setSelectedIds(new Set((selectedData ?? []).map(r => r.quest_id)))
      setProgress(Object.fromEntries((progressData ?? []).map(p => [p.condition_id, p.value])))
      setLoading(false)
    }
    fetchData()
  }, [characterId])

  function handleToggle(questId, isSelected) {
    setToggleError(null)
    if (isSelected) {
      setSelectedIds(prev => { const s = new Set(prev); s.delete(questId); return s })
      startTransition(async () => {
        const result = await removeCharacterQuest(characterId, questId)
        if (result?.error) {
          setSelectedIds(prev => new Set([...prev, questId]))
          setToggleError(result.error)
        }
      })
    } else {
      setSelectedIds(prev => new Set([...prev, questId]))
      startTransition(async () => {
        const result = await addCharacterQuest(characterId, questId)
        if (result?.error) {
          setSelectedIds(prev => { const s = new Set(prev); s.delete(questId); return s })
          setToggleError(result.error)
        }
      })
    }
  }

  function handleChangeCondition(conditionId, type, rawValue) {
    const value = type === 'check' ? (rawValue ? 1 : 0) : (parseInt(rawValue) || 0)
    setProgress(prev => ({ ...prev, [conditionId]: value }))
    startTransition(async () => {
      await upsertProgress(characterId, conditionId, value)
    })
  }

  const selectedQuests = allQuests.filter(q => selectedIds.has(q.id))
  const categories = CATEGORY_ORDER.filter(cat => selectedQuests.some(q => q.category === cat))
  const effectiveCategory = categories.includes(activeCategory) ? activeCategory : (categories[0] ?? '퀘스트')

  const filtered = selectedQuests.filter(q => q.category === effectiveCategory)
  const grouped = filtered.reduce((acc, q) => {
    const key = q.sub_category || '기타'
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.4 }}>불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex gap-1 flex-wrap flex-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-3 rounded text-xs font-medium transition-colors"
              style={{
                minHeight: '36px',
                ...(effectiveCategory === cat
                  ? { backgroundColor: 'var(--parchment)', color: 'var(--ink)', fontWeight: 600, border: '1.5px solid var(--gold)' }
                  : { color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.06)' })
              }}>
              {cat} ({selectedQuests.filter(q => q.category === cat).length})
            </button>
          ))}
        </div>
        <button onClick={() => setShowPicker(true)}
          className="btn-primary text-sm sm:text-xs w-full sm:w-auto px-4 sm:px-3 rounded font-medium flex-shrink-0"
          style={{ minHeight: '44px' }}>
          + 퀘스트 선택
        </button>
      </div>

      {toggleError && (
        <p className="text-xs rounded px-3 py-2 mb-2 flex-shrink-0"
          style={{ background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)' }}>
          오류: {toggleError}
        </p>
      )}

      {/* 퀘스트 목록 */}
      {selectedQuests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-sm" style={{ color: 'var(--parchment)', opacity: 0.35 }}>진행할 퀘스트를 선택하세요</p>
          <button onClick={() => setShowPicker(true)}
            className="btn-ghost mt-3 text-xs px-3 py-1.5 rounded">
            퀘스트 선택하기
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(grouped).map(([subCat, questList]) => (
            <div key={subCat}>
              {subCat !== '기타' && (
                <h4 className="text-xs font-semibold font-serif mb-2 flex items-center gap-2"
                  style={{ color: 'var(--gold)' }}>
                  <div className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.3)' }} />
                  ✦ {subCat}
                  <div className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.3)' }} />
                </h4>
              )}
              <div className="space-y-2">
                {questList.map(quest => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    progress={progress}
                    onChangeCondition={handleChangeCondition}
                    onRemove={() => handleToggle(quest.id, true)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <QuestPickerModal
          allQuests={allQuests}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
