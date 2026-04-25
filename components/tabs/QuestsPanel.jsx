'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase'
import { upsertProgress } from '@/app/actions/quests'

const CATEGORY_ORDER = ['퀘스트', '아르바이트', '이벤트', '미션']

export default function QuestsPanel({ characterId }) {
  const [quests, setQuests] = useState([])
  const [progress, setProgress] = useState({}) // { conditionId: value }
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('퀘스트')
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!characterId) return
    setLoading(true)

    async function fetchData() {
      const supabase = createClient()
      const [{ data: questData }, { data: progressData }] = await Promise.all([
        supabase
          .from('quests')
          .select('*, quest_conditions(id, name, type, max_value, sort_order), quest_rewards(id, item_id, amount, items(name, emoji))')
          .order('name'),
        supabase
          .from('quest_progress')
          .select('condition_id, value')
          .eq('character_id', characterId),
      ])
      setQuests(questData ?? [])
      setProgress(Object.fromEntries((progressData ?? []).map(p => [p.condition_id, p.value])))
      setLoading(false)
    }

    fetchData()
  }, [characterId])

  function handleChange(conditionId, type, rawValue) {
    const value = type === 'check' ? (rawValue ? 1 : 0) : (parseInt(rawValue) || 0)
    setProgress(prev => ({ ...prev, [conditionId]: value }))
    startTransition(async () => {
      await upsertProgress(characterId, conditionId, value)
    })
  }

  const categories = CATEGORY_ORDER.filter(cat => quests.some(q => q.category === cat))
  const filtered = quests.filter(q => q.category === activeCategory)

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

  if (quests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <div className="text-4xl mb-2">📜</div>
        <p className="text-sm">등록된 퀘스트가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 카테고리 탭 */}
      <div className="flex gap-1 mb-4 flex-shrink-0">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-amber-700/60 text-amber-300 border border-amber-600/40'
                : 'text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}>
            {cat} ({quests.filter(q => q.category === cat).length})
          </button>
        ))}
      </div>

      {/* 퀘스트 목록 */}
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
                      {total > 0 && (
                        <span className="text-xs text-slate-500">{done}/{total}</span>
                      )}
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
    </div>
  )
}
