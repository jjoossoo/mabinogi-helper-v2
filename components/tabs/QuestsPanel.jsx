'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase'
import { upsertProgress, addCharacterQuest, removeCharacterQuest } from '@/app/actions/quests'

const CATEGORY_ORDER = ['퀘스트', '아르바이트', '이벤트', '미션']

function QuestPickerModal({ allQuests, selectedIds, onToggle, onClose }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0])
  const [search, setSearch] = useState('')

  const categories = CATEGORY_ORDER.filter(cat => allQuests.some(q => q.category === cat))
  const filtered = allQuests.filter(q =>
    q.category === activeCategory &&
    (!search.trim() || q.name.includes(search.trim()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-slate-800 border border-amber-900/50 rounded-lg shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/30">
          <h3 className="text-amber-300 font-semibold">퀘스트 선택</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-amber-900/20 flex flex-col gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="퀘스트 검색..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-700/40">
          {filtered.map(quest => {
            const isSelected = selectedIds.has(quest.id)
            return (
              <div key={quest.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/20">
                <div className="flex-1 min-w-0">
                  <span className="text-slate-200 text-sm">{quest.name}</span>
                  {quest.sub_category && (
                    <span className="ml-2 text-xs text-slate-500">{quest.sub_category}</span>
                  )}
                </div>
                <button
                  onClick={() => onToggle(quest.id, isSelected)}
                  className={`ml-3 text-xs px-3 py-1 rounded border transition-colors flex-shrink-0 ${
                    isSelected
                      ? 'text-red-400 border-red-800/40 hover:bg-red-900/20'
                      : 'text-amber-400 border-amber-800/40 hover:bg-amber-900/20'
                  }`}
                >
                  {isSelected ? '제거' : '추가'}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-slate-600 text-sm">퀘스트가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  )
}

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
        supabase
          .from('quests')
          .select('*, quest_conditions(id, name, type, max_value, sort_order), quest_rewards(id, item_id, amount, items(name, emoji))')
          .order('name'),
        supabase
          .from('character_quests')
          .select('quest_id')
          .eq('character_id', characterId),
        supabase
          .from('quest_progress')
          .select('condition_id, value')
          .eq('character_id', characterId),
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

  function handleChange(conditionId, type, rawValue) {
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
      <div className="flex items-center justify-center h-full text-slate-600">
        <span className="text-sm">불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                effectiveCategory === cat
                  ? 'bg-amber-700/60 text-amber-300 border border-amber-600/40'
                  : 'text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}>
              {cat} ({selectedQuests.filter(q => q.category === cat).length})
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 ml-2"
        >
          + 퀘스트 선택
        </button>
      </div>

      {toggleError && (
        <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded px-3 py-2 mb-2 flex-shrink-0">
          오류: {toggleError}
        </p>
      )}

      {/* 퀘스트 목록 */}
      {selectedQuests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-sm">진행할 퀘스트를 선택하세요</p>
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/40 px-3 py-1.5 rounded"
          >
            퀘스트 선택하기
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(grouped).map(([subCat, questList]) => (
            <div key={subCat}>
              {subCat !== '기타' && (
                <h4 className="text-amber-600 text-xs font-semibold mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-amber-900/30" />
                  {subCat}
                  <div className="h-px flex-1 bg-amber-900/30" />
                </h4>
              )}
              <div className="space-y-2">
                {questList.map(quest => {
                  const conditions = (quest.quest_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order)
                  const total = conditions.length
                  const done = conditions.filter(c => {
                    const val = progress[c.id] ?? 0
                    return c.type === 'check' ? val >= 1 : c.max_value != null && val >= c.max_value
                  }).length
                  const isComplete = total > 0 && done === total

                  return (
                    <div key={quest.id} className={`bg-slate-800/60 border rounded-lg p-3 transition-colors ${
                      isComplete ? 'border-green-800/40 bg-green-900/10' : 'border-amber-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium text-sm ${isComplete ? 'text-green-400' : 'text-slate-200'}`}>
                          {isComplete && '✓ '}{quest.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {total > 0 && (
                            <span className="text-xs text-slate-500">{done}/{total}</span>
                          )}
                          <button
                            onClick={() => handleToggle(quest.id, true)}
                            title="목록에서 제거"
                            className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                          >✕</button>
                        </div>
                      </div>

                      {conditions.length > 0 && (
                        <div className="space-y-2">
                          {conditions.map(cond => {
                            const val = progress[cond.id] ?? 0
                            const condDone = cond.type === 'check' ? val >= 1 : (cond.max_value != null && val >= cond.max_value)
                            return (
                              <div key={cond.id} className="flex items-center gap-3">
                                {cond.type === 'check' ? (
                                  <input
                                    type="checkbox"
                                    checked={val >= 1}
                                    onChange={e => handleChange(cond.id, 'check', e.target.checked)}
                                    className="w-4 h-4 accent-amber-500 flex-shrink-0"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    value={val}
                                    min={0}
                                    max={cond.max_value ?? undefined}
                                    onChange={e => handleChange(cond.id, 'progress', e.target.value)}
                                    onFocus={e => e.target.select()}
                                    className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center flex-shrink-0"
                                  />
                                )}
                                <span className={`text-xs flex-1 ${condDone ? 'text-green-400 line-through' : 'text-slate-300'}`}>
                                  {cond.name}
                                </span>
                                {cond.type === 'progress' && cond.max_value != null && (
                                  <span className="text-xs text-slate-500 flex-shrink-0">/ {cond.max_value}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {(quest.quest_rewards ?? []).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap gap-1.5">
                          {quest.quest_rewards.map(r => (
                            <span key={r.id} className="text-xs text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                              {r.items?.emoji} {r.items?.name} ×{r.amount}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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
