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
const EMPTY_FORM = { name: '', category: '퀘스트', sub_category: '', description: '', conditions: [], rewards: [] }

function QuestModal({ quest, items, onClose, onSave }) {
  const [form, setForm] = useState(() => quest ? {
    name: quest.name,
    category: quest.category,
    sub_category: quest.sub_category,
    description: quest.description,
    conditions: (quest.quest_conditions ?? []).sort((a, b) => a.sort_order - b.sort_order).map(c => ({
      name: c.name, type: c.type, max_value: c.max_value ?? ''
    })),
    rewards: (quest.quest_rewards ?? []).map(r => ({ item_id: r.item_id, amount: r.amount })),
  } : EMPTY_FORM)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const subCats = SUB_CATEGORIES[form.category] ?? []

  function addCondition() {
    set('conditions', [...form.conditions, { name: '', type: 'check', max_value: '' }])
  }
  function updateCondition(i, k, v) {
    set('conditions', form.conditions.map((c, idx) => idx === i ? { ...c, [k]: v } : c))
  }
  function removeCondition(i) {
    set('conditions', form.conditions.filter((_, idx) => idx !== i))
  }

  function addReward() {
    set('rewards', [...form.rewards, { item_id: '', amount: 1 }])
  }
  function updateReward(i, k, v) {
    set('rewards', form.rewards.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  }
  function removeReward(i) {
    set('rewards', form.rewards.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('퀘스트명을 입력해주세요')
    setError(null)
    const data = {
      name: form.name.trim(),
      category: form.category,
      sub_category: form.sub_category,
      description: form.description,
      conditions: form.conditions.filter(c => c.name.trim()),
      rewards: form.rewards.filter(r => r.item_id),
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{error}</p>}

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

          {/* 조건 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-xs font-medium">조건 목록</label>
              <button type="button" onClick={addCondition}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">+ 추가</button>
            </div>
            <div className="space-y-2">
              {form.conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={cond.name} onChange={e => updateCondition(i, 'name', e.target.value)}
                    placeholder="조건명"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500" />
                  <select value={cond.type} onChange={e => updateCondition(i, 'type', e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                    <option value="check">체크</option>
                    <option value="progress">진행도</option>
                  </select>
                  {cond.type === 'progress' && (
                    <input type="number" value={cond.max_value} min={1}
                      onChange={e => updateCondition(i, 'max_value', parseInt(e.target.value) || '')}
                      onFocus={e => e.target.select()}
                      placeholder="목표"
                      className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center" />
                  )}
                  <button type="button" onClick={() => removeCondition(i)}
                    className="text-slate-500 hover:text-red-400 text-xs px-1 py-1.5">✕</button>
                </div>
              ))}
              {form.conditions.length === 0 && (
                <p className="text-slate-600 text-xs">조건이 없습니다</p>
              )}
            </div>
          </div>

          {/* 보상 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-xs font-medium">보상 목록</label>
              <button type="button" onClick={addReward}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">+ 추가</button>
            </div>
            <div className="space-y-2">
              {form.rewards.map((reward, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={reward.item_id} onChange={e => updateReward(i, 'item_id', e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                    <option value="">아이템 선택</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.emoji} {it.name}</option>)}
                  </select>
                  <input type="number" value={reward.amount} min={1}
                    onChange={e => updateReward(i, 'amount', parseInt(e.target.value) || 1)}
                    onFocus={e => e.target.select()}
                    className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center" />
                  <button type="button" onClick={() => removeReward(i)}
                    className="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
          </div>
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
      {/* 툴바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/20 flex-shrink-0">
        <div className="flex gap-1">
          {['전체', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterCategory === cat ? 'bg-amber-700 text-white' : 'text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}>{cat}</button>
          ))}
        </div>
        <button onClick={() => setModal('add')}
          className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded">+ 퀘스트 추가</button>
      </div>

      {/* 퀘스트 목록 */}
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
                </div>
                {quest.description && <p className="text-slate-500 text-xs mt-1">{quest.description}</p>}
                {(quest.quest_conditions ?? []).length > 0 && (
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
