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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>
            ✦ {item ? '아이템 수정' : '아이템 추가'}
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{
              background: 'rgba(139,32,32,0.1)',
              border: '1px solid var(--crimson)',
              color: 'var(--crimson-light)',
            }}>{error}</p>
          )}

          <div className="grid grid-cols-[3rem_1fr] gap-2">
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>아이콘</label>
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4}
                className="input-field w-full rounded px-2 py-2 text-center text-lg" />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>아이템명 *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="아이템명"
                className="input-field w-full rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>카테고리</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="input-field w-full rounded px-3 py-2 text-sm">
              <option value="">미분류</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="input-field w-full rounded px-3 py-2 text-sm resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.craftable}
              onChange={e => set('craftable', e.target.checked)}
              style={{ accentColor: 'var(--sage)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>제작 가능 아이템</span>
          </label>

          {form.craftable && (
            <>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>1회 생산량</label>
                <input type="number" value={form.craft_output} min={1}
                  onChange={e => set('craft_output', parseInt(e.target.value) || 1)}
                  onFocus={e => e.target.select()}
                  className="input-field w-32 rounded px-3 py-2 text-sm" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'var(--ink)' }}>재료 목록</label>
                  <button type="button" onClick={addMaterial}
                    className="btn-ghost-sm px-2 py-0.5 rounded">+ 재료 추가</button>
                </div>
                <div className="space-y-2">
                  {form.materials.map((mat, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={mat.material_id}
                        onChange={e => updateMaterial(i, 'material_id', e.target.value)}
                        className="input-field flex-1 rounded px-2 py-1.5 text-xs">
                        <option value="">아이템 선택</option>
                        {items.filter(it => it.id !== item?.id).map(it => (
                          <option key={it.id} value={it.id}>{it.emoji} {it.name}</option>
                        ))}
                      </select>
                      <input type="number" value={mat.amount} min={1}
                        onChange={e => updateMaterial(i, 'amount', parseInt(e.target.value) || 1)}
                        onFocus={e => e.target.select()}
                        className="input-field w-16 rounded px-2 py-1.5 text-xs text-center" />
                      <button type="button" onClick={() => removeMaterial(i)}
                        className="text-xs px-1 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--crimson-light)' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </form>

        <div
          className="flex gap-3 px-5 py-4"
          style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}
        >
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

export default function ItemsTab({ categories, setCategories, items, setItems }) {
  const [filterCategoryId, setFilterCategoryId] = useState(null)
  const [modal, setModal] = useState(null)
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
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* 카테고리 사이드바 */}
      <aside
        className="flex-shrink-0 md:w-52 md:flex-col md:overflow-y-auto"
        style={{
          backgroundColor: 'var(--parchment-dark)',
          borderBottom: '1px solid rgba(138,106,31,0.25)',
        }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}>
          <p className="font-serif font-semibold text-xs mb-2 hidden md:block" style={{ color: 'var(--gold-dark)' }}>✦ 카테고리</p>
          <div className="flex gap-1">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="새 카테고리"
              className="input-field flex-1 rounded px-2 py-1.5 text-xs" />
            <button onClick={handleAddCategory}
              className="btn-primary text-xs px-3 py-1.5 rounded font-bold">+</button>
          </div>
          {catError && <p className="text-xs mt-1" style={{ color: 'var(--crimson-light)' }}>{catError}</p>}
        </div>
        {/* 모바일: 가로 스크롤 / 데스크탑: 세로 목록 */}
        <ul className="flex overflow-x-auto md:flex-col md:overflow-x-hidden md:overflow-y-auto py-1.5 md:py-1 px-1.5 md:px-0 gap-1 md:gap-0">
          <li className="flex-shrink-0 md:flex-shrink">
            <button
              onClick={() => setFilterCategoryId(null)}
              className="whitespace-nowrap md:w-full text-left px-3 py-2 text-sm rounded md:rounded-none transition-colors"
              style={{
                color: !filterCategoryId ? 'var(--gold-dark)' : 'var(--ink)',
                backgroundColor: !filterCategoryId ? 'rgba(201,168,76,0.18)' : 'transparent',
                fontWeight: !filterCategoryId ? 600 : 400,
                minHeight: '36px',
              }}
            >
              전체 ({items.length})
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.id} className="group flex items-center flex-shrink-0 md:flex-shrink">
              <button
                onClick={() => setFilterCategoryId(cat.id)}
                className="whitespace-nowrap md:flex-1 text-left px-3 py-2 text-sm rounded md:rounded-none transition-colors"
                style={{
                  color: filterCategoryId === cat.id ? 'var(--gold-dark)' : 'var(--ink)',
                  backgroundColor: filterCategoryId === cat.id ? 'rgba(201,168,76,0.18)' : 'transparent',
                  fontWeight: filterCategoryId === cat.id ? 600 : 400,
                  minHeight: '36px',
                }}
              >
                {cat.name} ({items.filter(i => i.category_id === cat.id).length})
              </button>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-2 transition-all"
                style={{ color: 'var(--crimson-light)' }}
              >✕</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* 아이템 목록 */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--panel-bg)', borderLeft: '1px solid rgba(138,106,31,0.2)' }}
      >
        <div
          className="flex items-center justify-between px-4 md:px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}
        >
          <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.55 }}>{filteredItems.length}개 아이템</span>
          <button onClick={() => setModal('add')}
            className="btn-primary text-sm px-3 py-2 rounded" style={{ minHeight: '40px' }}>
            + 아이템 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto dots-bg">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--parchment-dark)' }}>
              <tr>
                <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>아이템</th>
                <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>카테고리</th>
                <th className="text-left px-4 py-2 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>제작</th>
                <th className="px-4 py-2" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.filter(item => item != null).map((item, idx) => (
                <tr
                  key={item.id}
                  className="transition-colors"
                  style={{
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(138,106,31,0.04)',
                    borderBottom: '1px solid rgba(138,106,31,0.12)',
                  }}
                >
                  <td className="px-4 py-2.5">
                    <span className="mr-2">{item.emoji}</span>
                    <span style={{ color: 'var(--ink)' }}>{item.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>
                    {item.item_categories?.name ?? '미분류'}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>
                    {item.craft_output ? `${item.craft_output}개씩` : '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setModal(item)}
                        className="btn-ghost-sm px-2 py-1 rounded">수정</button>
                      <button onClick={() => handleDeleteItem(item.id)}
                        className="btn-danger text-xs px-2 py-1 rounded">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>
                    아이템이 없습니다
                  </td>
                </tr>
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
