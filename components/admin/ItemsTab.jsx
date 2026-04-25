'use client'

import { useState, useTransition } from 'react'
import { addCategory, deleteCategory, addItem, updateItem, deleteItem } from '@/app/actions/admin'

const EMPTY_FORM = { name: '', category_id: '', emoji: '📦', description: '', craftable: false, craft_output: 1, materials: [] }

function ItemModal({ item, categories, items, onClose, onSave }) {
  const [form, setForm] = useState(() => item ? {
    name: item.name,
    category_id: item.category_id ?? '',
    emoji: item.emoji,
    description: item.description,
    craftable: !!item.craft_output,
    craft_output: item.craft_output ?? 1,
    materials: item.recipes ?? [],
  } : EMPTY_FORM)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addMaterial() {
    set('materials', [...form.materials, { material_id: '', amount: 1 }])
  }
  function updateMaterial(i, k, v) {
    set('materials', form.materials.map((m, idx) => idx === i ? { ...m, [k]: v } : m))
  }
  function removeMaterial(i) {
    set('materials', form.materials.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('아이템명을 입력해주세요')
    setError(null)
    const data = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      emoji: form.emoji || '📦',
      description: form.description,
      craft_output: form.craftable ? form.craft_output : null,
      materials: form.craftable ? form.materials.filter(m => m.material_id) : [],
    }
    startTransition(async () => {
      const result = item ? await updateItem(item.id, data) : await addItem(data)
      if (result.error) setError(result.error)
      else onSave(result.item)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-slate-800 border border-amber-900/50 rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/30">
          <h3 className="text-amber-300 font-semibold">{item ? '아이템 수정' : '아이템 추가'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-[3rem_1fr] gap-2">
            <div>
              <label className="block text-slate-300 text-xs mb-1">아이콘</label>
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-2 text-center text-lg focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-slate-300 text-xs mb-1">아이템명 *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="아이템명"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs mb-1">카테고리</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500">
              <option value="">미분류</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-xs mb-1">설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.craftable} onChange={e => set('craftable', e.target.checked)} className="accent-amber-500" />
            <span className="text-slate-300 text-sm">제작 가능 아이템</span>
          </label>

          {form.craftable && <>
            <div>
              <label className="block text-slate-300 text-xs mb-1">1회 생산량</label>
              <input type="number" value={form.craft_output} min={1}
                onChange={e => set('craft_output', parseInt(e.target.value) || 1)}
                onFocus={e => e.target.select()}
                className="w-32 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 text-xs">재료 목록</label>
                <button type="button" onClick={addMaterial}
                  className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">+ 재료 추가</button>
              </div>
              <div className="space-y-2">
                {form.materials.map((mat, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={mat.material_id} onChange={e => updateMaterial(i, 'material_id', e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                      <option value="">아이템 선택</option>
                      {items.filter(it => it.id !== item?.id).map(it => (
                        <option key={it.id} value={it.id}>{it.emoji} {it.name}</option>
                      ))}
                    </select>
                    <input type="number" value={mat.amount} min={1}
                      onChange={e => updateMaterial(i, 'amount', parseInt(e.target.value) || 1)}
                      onFocus={e => e.target.select()}
                      className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 text-center" />
                    <button type="button" onClick={() => removeMaterial(i)}
                      className="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </>}
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

export default function ItemsTab({ categories, setCategories, items, setItems }) {
  const [filterCategoryId, setFilterCategoryId] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | item object
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handleAddCategory() {
    if (!newCatName.trim()) return setCatError('카테고리명을 입력해주세요')
    setCatError(null)
    startTransition(async () => {
      const result = await addCategory(newCatName.trim())
      if (result.error) return setCatError(result.error)
      setCategories(prev => [...prev, result.category])
      setNewCatName('')
    })
  }

  function handleDeleteCategory(id) {
    if (!confirm('카테고리를 삭제하면 해당 아이템의 카테고리가 해제됩니다. 계속할까요?')) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (!result.error) {
        setCategories(prev => prev.filter(c => c.id !== id))
        if (filterCategoryId === id) setFilterCategoryId(null)
      }
    })
  }

  function handleSaveItem(item) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id)
      return idx >= 0 ? prev.map(i => i.id === item.id ? item : i) : [...prev, item]
    })
    setModal(null)
  }

  function handleDeleteItem(id) {
    if (!confirm('아이템을 삭제할까요? 이 아이템을 재료로 사용하는 레시피도 제거됩니다.')) return
    startTransition(async () => {
      const result = await deleteItem(id)
      if (!result.error) setItems(prev => prev.filter(i => i.id !== id))
    })
  }

  const filteredItems = filterCategoryId
    ? items.filter(i => i.category_id === filterCategoryId)
    : items

  return (
    <div className="flex h-full">
      {/* 카테고리 사이드바 */}
      <aside className="w-52 flex-shrink-0 border-r border-amber-900/20 flex flex-col bg-slate-800/30 overflow-y-auto">
        <div className="p-3 border-b border-amber-900/20">
          <p className="text-amber-400 text-xs font-semibold mb-2">카테고리</p>
          <div className="flex gap-1">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="새 카테고리"
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-amber-500" />
            <button onClick={handleAddCategory} className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded">+</button>
          </div>
          {catError && <p className="text-red-400 text-xs mt-1">{catError}</p>}
        </div>
        <ul className="flex-1 py-1">
          <li>
            <button onClick={() => setFilterCategoryId(null)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${!filterCategoryId ? 'text-amber-400 bg-amber-900/20' : 'text-slate-300 hover:bg-slate-700/40'}`}>
              전체 ({items.length})
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.id} className="group flex items-center">
              <button onClick={() => setFilterCategoryId(cat.id)}
                className={`flex-1 text-left px-3 py-2 text-sm transition-colors ${filterCategoryId === cat.id ? 'text-amber-400 bg-amber-900/20' : 'text-slate-300 hover:bg-slate-700/40'}`}>
                {cat.name} ({items.filter(i => i.category_id === cat.id).length})
              </button>
              <button onClick={() => handleDeleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs px-2 py-2 transition-all">✕</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* 아이템 목록 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/20">
          <span className="text-slate-400 text-sm">{filteredItems.length}개 아이템</span>
          <button onClick={() => setModal('add')}
            className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded transition-colors">
            + 아이템 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">아이템</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">카테고리</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">제작</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filteredItems
                .filter(item => item != null) /* 💡 마법의 한 줄: null인 데이터를 아예 걸러냅니다! */
                .map(item => (
                <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="mr-2">{item.emoji}</span>
                    <span className="text-slate-200">{item.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{item.item_categories?.name ?? '미분류'}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">
                    {item.craft_output ? `${item.craft_output}개씩` : '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setModal(item)}
                        className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/40 px-2 py-1 rounded">수정</button>
                      <button onClick={() => handleDeleteItem(item.id)}
                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-600/40 px-2 py-1 rounded">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 text-sm">아이템이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ItemModal
          item={modal === 'add' ? null : modal}
          categories={categories}
          items={items}
          onClose={() => setModal(null)}
          onSave={handleSaveItem}
        />
      )}
    </div>
  )
}
