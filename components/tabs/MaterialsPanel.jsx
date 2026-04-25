'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

// v1 로직을 Supabase 스키마에 맞게 이식
function calcMaterials(itemId, amount, itemsMap, recipesMap, craftOwned, craftPlan, baseMaterials, parentId) {
  const item = itemsMap[itemId]

  if (!item?.craft_output) {
    if (!baseMaterials[itemId]) baseMaterials[itemId] = { amount: 0, usedBy: {} }
    baseMaterials[itemId].amount += amount
    if (parentId) baseMaterials[itemId].usedBy[parentId] = (baseMaterials[itemId].usedBy[parentId] ?? 0) + amount
    return
  }

  const mats = recipesMap[itemId] ?? []
  const craftCount = Math.ceil(amount / item.craft_output)
  const ownedCrafts = Math.min(craftOwned[itemId] ?? 0, craftCount)
  const remaining = craftCount - ownedCrafts

  if (!craftPlan[itemId]) craftPlan[itemId] = { count: 0, usedBy: {} }
  craftPlan[itemId].count += craftCount
  if (parentId) craftPlan[itemId].usedBy[parentId] = (craftPlan[itemId].usedBy[parentId] ?? 0) + craftCount

  if (remaining > 0) {
    for (const mat of mats) {
      calcMaterials(mat.material_id, mat.amount * remaining, itemsMap, recipesMap, craftOwned, craftPlan, baseMaterials, itemId)
    }
  }
}

export default function MaterialsPanel() {
  const [items, setItems] = useState([])
  const [recipesMap, setRecipesMap] = useState({})
  const [loading, setLoading] = useState(true)

  const [targets, setTargets] = useState([])  // { itemId, amount, owned }
  const [craftOwned, setCraftOwned] = useState({}) // 중간 제작 완료 횟수
  const [baseOwned, setBaseOwned] = useState({})   // 재료 보유량
  const [search, setSearch] = useState('')
  const [expandedItem, setExpandedItem] = useState(null) // 트리 펼칠 아이템

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [{ data: itemData }, { data: recipeData }] = await Promise.all([
        supabase.from('items').select('id, name, emoji, craft_output').order('name'),
        supabase.from('recipes').select('item_id, material_id, amount'),
      ])
      setItems(itemData ?? [])
      const map = {}
      for (const r of (recipeData ?? [])) {
        if (!map[r.item_id]) map[r.item_id] = []
        map[r.item_id].push({ material_id: r.material_id, amount: r.amount })
      }
      setRecipesMap(map)
      setLoading(false)
    }
    fetchData()
  }, [])

  const itemsMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])

  const result = useMemo(() => {
    const craftPlan = {}
    const baseMaterials = {}
    for (const target of targets) {
      const needed = Math.max(0, target.amount - (target.owned ?? 0))
      if (needed > 0) calcMaterials(target.itemId, needed, itemsMap, recipesMap, craftOwned, craftPlan, baseMaterials, null)
    }
    return { craftPlan, baseMaterials }
  }, [targets, itemsMap, recipesMap, craftOwned])

  const searchResults = search.trim()
    ? items.filter(i => i.name.includes(search.trim())).slice(0, 10)
    : []

  function addTarget(item) {
    setSearch('')
    if (targets.some(t => t.itemId === item.id)) return
    setTargets(prev => [...prev, { itemId: item.id, amount: 1, owned: 0 }])
  }
  function updateTarget(idx, k, v) {
    setTargets(prev => prev.map((t, i) => i === idx ? { ...t, [k]: v } : t))
  }
  function removeTarget(idx) {
    setTargets(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-600 text-sm">불러오는 중...</div>
  }

  const baseMaterialEntries = Object.entries(result.baseMaterials)
  const craftPlanEntries = Object.entries(result.craftPlan)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 아이템 검색 + 목표 목록 */}
      <div className="flex-shrink-0 space-y-3">
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="아이템 검색 후 추가..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded shadow-xl z-10 max-h-48 overflow-y-auto">
              {searchResults.map(item => (
                <button key={item.id} onClick={() => addTarget(item)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-900/30 flex items-center gap-2">
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                  {item.craft_output && <span className="text-xs text-slate-500 ml-auto">제작</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {targets.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs">목표 아이템</p>
            {targets.map((t, idx) => {
              const item = itemsMap[t.itemId]
              return (
                <div key={t.itemId} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded px-3 py-2">
                  <span className="text-base">{item?.emoji}</span>
                  <span className="flex-1 text-sm text-slate-200">{item?.name}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>목표</span>
                    <input type="number" value={t.amount} min={1}
                      onChange={e => updateTarget(idx, 'amount', parseInt(e.target.value) || 1)}
                      onFocus={e => e.target.select()}
                      className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-center text-slate-100 focus:outline-none focus:border-amber-500" />
                    <span>보유</span>
                    <input type="number" value={t.owned ?? 0} min={0}
                      onChange={e => updateTarget(idx, 'owned', parseInt(e.target.value) || 0)}
                      onFocus={e => e.target.select()}
                      className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-center text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                  <button onClick={() => removeTarget(idx)} className="text-slate-500 hover:text-red-400 text-xs ml-1">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {targets.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
          <div className="text-4xl mb-2">⚗️</div>
          <p className="text-sm">위에서 아이템을 검색해 추가하세요</p>
        </div>
      )}

      {targets.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* 필요 재료 (기본 재료) */}
          {baseMaterialEntries.length > 0 && (
            <div>
              <h3 className="text-amber-400 text-xs font-semibold mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-amber-900/30" />
                필요 재료
                <div className="h-px flex-1 bg-amber-900/30" />
              </h3>
              <div className="space-y-1.5">
                {baseMaterialEntries.map(([id, info]) => {
                  const item = itemsMap[id]
                  const owned = baseOwned[id] ?? 0
                  const isDone = owned >= info.amount
                  const usedByItems = Object.keys(info.usedBy)
                  const isExpanded = expandedItem === id

                  return (
                    <div key={id} className={`bg-slate-800/60 border rounded-lg px-3 py-2 ${isDone ? 'border-green-800/40' : 'border-slate-700/40'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item?.emoji ?? '📦'}</span>
                        <span className={`flex-1 text-sm ${isDone ? 'text-green-400' : 'text-slate-200'}`}>
                          {item?.name ?? id}
                        </span>
                        <span className={`text-xs font-medium ${isDone ? 'text-green-400' : 'text-amber-400'}`}>
                          {info.amount}개 필요
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">보유</span>
                          <input type="number" value={owned} min={0}
                            onChange={e => setBaseOwned(prev => ({ ...prev, [id]: parseInt(e.target.value) || 0 }))}
                            onFocus={e => e.target.select()}
                            className={`w-14 bg-slate-700 border rounded px-2 py-0.5 text-center text-xs focus:outline-none ${
                              isDone ? 'border-green-700/50 text-green-400' : 'border-slate-600 text-slate-100 focus:border-amber-500'
                            }`} />
                        </div>
                        {usedByItems.length > 0 && (
                          <button onClick={() => setExpandedItem(isExpanded ? null : id)}
                            className="text-slate-500 hover:text-slate-300 text-xs border border-slate-700 px-1.5 py-0.5 rounded">
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                      {isExpanded && usedByItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap gap-1.5">
                          {usedByItems.map(pid => {
                            const pItem = itemsMap[pid]
                            return (
                              <span key={pid} className="text-xs text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                                {pItem?.emoji} {pItem?.name} ×{info.usedBy[pid]}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 제작 계획 */}
          {craftPlanEntries.length > 0 && (
            <div>
              <h3 className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-700/40" />
                제작 계획
                <div className="h-px flex-1 bg-slate-700/40" />
              </h3>
              <div className="space-y-1.5">
                {craftPlanEntries.map(([id, info]) => {
                  const item = itemsMap[id]
                  const owned = craftOwned[id] ?? 0

                  return (
                    <div key={id} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
                      <span>{item?.emoji ?? '⚗️'}</span>
                      <span className="flex-1 text-sm text-slate-300">{item?.name ?? id}</span>
                      <span className="text-xs text-slate-400">{info.count}회 제작</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">완료</span>
                        <input type="number" value={owned} min={0} max={info.count}
                          onChange={e => setCraftOwned(prev => ({ ...prev, [id]: parseInt(e.target.value) || 0 }))}
                          onFocus={e => e.target.select()}
                          className="w-12 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-center text-xs text-slate-100 focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
