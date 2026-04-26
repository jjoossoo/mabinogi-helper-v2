'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addCategory, deleteCategory, addItem, updateItem, deleteItem } from '@/app/actions/admin'

const EMPTY_FORM = { name: '', category_id: '', emoji: '📦', description: '', craftable: false, craft_output: 1, materials: [] }

// 선택된 값은 label로 표시, 포커스 시 검색 모드로 전환
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
        <ul
          className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}
        >
          {filtered.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(opt); setEditing(false); setQuery('') }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}
              >
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

// 아이템명 자동완성 — 자유 입력이되 기존 아이템 제안
function NameAutocomplete({ value, onChange, onSelect, items, excludeId }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const suggestions = value.trim().length >= 1
    ? items.filter(i => i.id !== excludeId && i.name.includes(value.trim())).slice(0, 8)
    : []

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        placeholder="아이템명"
        className="input-field w-full rounded px-3 py-2 text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}
        >
          {suggestions.map(it => (
            <li key={it.id}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(it); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}
              >
                <span>{it.emoji}</span>
                <span>{it.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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

  function addMaterial() { set('materials', [...form.materials, { material_id: '', amount: 1 }]) }
  function updateMaterial(i, k, v) {
    set('materials', form.materials.map((m, idx) => idx === i ? { ...m, [k]: v } : m))
  }
  function removeMaterial(i) { set('materials', form.materials.filter((_, idx) => idx !== i)) }

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

  const categoryOptions = [
    { value: '', label: '미분류' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]
  const selectedCategory = categories.find(c => c.id === form.category_id)

  const materialOptions = items
    .filter(i => i.id !== item?.id)
    .map(i => ({ value: i.id, label: i.name, emoji: i.emoji }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4">
      <div className="panel dots-bg w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h3 className="font-serif font-semibold" style={{ color: 'var(--gold-dark)' }}>
            ✦ {item ? '아이템 수정' : '아이템 추가'}
          </h3>
          <button onClick={onClose} className="text-xl leading-none transition-opacity hover:opacity-60" style={{ color: 'var(--ink)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{
              background: 'rgba(139,32,32,0.1)', border: '1px solid var(--crimson)', color: 'var(--crimson-light)',
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
              <NameAutocomplete
                value={form.name}
                onChange={v => set('name', v)}
                onSelect={it => { set('name', it.name); set('emoji', it.emoji) }}
                items={items}
                excludeId={item?.id}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--ink)' }}>카테고리</label>
            <SearchSelect
              selectedLabel={selectedCategory?.name ?? '미분류'}
              onSelect={opt => set('category_id', opt.value)}
              options={categoryOptions}
              placeholder="카테고리 검색..."
            />
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
                  <button type="button" onClick={addMaterial} className="btn-ghost-sm px-2 py-0.5 rounded">+ 재료 추가</button>
                </div>
                <div className="space-y-2">
                  {form.materials.map((mat, i) => {
                    const selectedMat = items.find(it => it.id === mat.material_id)
                    return (
                      <div key={i} className="flex gap-2 items-center">
                        <SearchSelect
                          selectedLabel={selectedMat ? `${selectedMat.emoji} ${selectedMat.name}` : ''}
                          onSelect={opt => updateMaterial(i, 'material_id', opt.value)}
                          options={materialOptions}
                          placeholder="재료 검색..."
                          className="flex-1"
                        />
                        <input type="number" value={mat.amount} min={1}
                          onChange={e => updateMaterial(i, 'amount', parseInt(e.target.value) || 1)}
                          onFocus={e => e.target.select()}
                          className="input-field w-16 rounded px-2 py-1.5 text-xs text-center" />
                        <button type="button" onClick={() => removeMaterial(i)}
                          className="text-xs px-1 transition-opacity hover:opacity-70"
                          style={{ color: 'var(--crimson-light)' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </form>

        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
          <button type="button" onClick={onClose} className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 py-2 rounded text-sm">
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ItemsTab({ categories, setCategories, items, setItems }) {
  const [filterCategoryId, setFilterCategoryId] = useState(null) // null=전체, 'uncategorized'=미분류, uuid=특정
  const [searchQuery, setSearchQuery] = useState('')
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

  const uncategorizedCount = items.filter(i => !i.category_id).length

  const filteredItems = (() => {
    let result = items
    if (filterCategoryId === 'uncategorized') result = result.filter(i => !i.category_id)
    else if (filterCategoryId) result = result.filter(i => i.category_id === filterCategoryId)
    if (searchQuery.trim()) result = result.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return result
  })()

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* 카테고리 사이드바 */}
      <aside
        className="flex-shrink-0 md:w-52 md:flex-col md:overflow-y-auto"
        style={{ backgroundColor: 'var(--parchment-dark)', borderBottom: '1px solid rgba(138,106,31,0.25)' }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}>
          <p className="font-serif font-semibold text-xs mb-2 hidden md:block" style={{ color: 'var(--gold-dark)' }}>✦ 카테고리</p>
          <div className="flex gap-1">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="새 카테고리"
              className="input-field flex-1 rounded px-2 py-1.5 text-xs" />
            <button onClick={handleAddCategory} className="btn-primary text-xs px-3 py-1.5 rounded font-bold">+</button>
          </div>
          {catError && <p className="text-xs mt-1" style={{ color: 'var(--crimson-light)' }}>{catError}</p>}
        </div>
        <ul className="flex overflow-x-auto md:flex-col md:overflow-x-hidden md:overflow-y-auto py-1.5 md:py-1 px-1.5 md:px-0 gap-1 md:gap-0">
          <li className="flex-shrink-0 md:flex-shrink">
            <button onClick={() => setFilterCategoryId(null)}
              className="whitespace-nowrap md:w-full text-left px-3 py-2 text-sm rounded md:rounded-none transition-colors"
              style={{
                color: filterCategoryId === null ? 'var(--gold-dark)' : 'var(--ink)',
                backgroundColor: filterCategoryId === null ? 'rgba(201,168,76,0.18)' : 'transparent',
                fontWeight: filterCategoryId === null ? 600 : 400,
                minHeight: '36px',
              }}
            >
              전체 ({items.length})
            </button>
          </li>
          <li className="flex-shrink-0 md:flex-shrink">
            <button onClick={() => setFilterCategoryId('uncategorized')}
              className="whitespace-nowrap md:w-full text-left px-3 py-2 text-sm rounded md:rounded-none transition-colors"
              style={{
                color: filterCategoryId === 'uncategorized' ? 'var(--gold-dark)' : 'var(--ink)',
                backgroundColor: filterCategoryId === 'uncategorized' ? 'rgba(201,168,76,0.18)' : 'transparent',
                fontWeight: filterCategoryId === 'uncategorized' ? 600 : 400,
                opacity: filterCategoryId === 'uncategorized' ? 1 : 0.6,
                minHeight: '36px',
              }}
            >
              미분류 ({uncategorizedCount})
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.id} className="group flex items-center flex-shrink-0 md:flex-shrink">
              <button onClick={() => setFilterCategoryId(cat.id)}
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
              <button onClick={() => handleDeleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-2 transition-all"
                style={{ color: 'var(--crimson-light)' }}>✕</button>
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
          className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 md:px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(138,106,31,0.25)' }}
        >
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="아이템 검색..."
            className="input-field flex-1 rounded px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.55 }}>{filteredItems.length}개</span>
            <button onClick={() => setModal('add')}
              className="btn-primary text-sm px-3 py-2 rounded" style={{ minHeight: '40px' }}>
              + 아이템 추가
            </button>
          </div>
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
                <tr key={item.id} className="transition-colors"
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
                      <button onClick={() => setModal(item)} className="btn-ghost-sm px-2 py-1 rounded">수정</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="btn-danger text-xs px-2 py-1 rounded">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink)', opacity: 0.4 }}>
                    {searchQuery ? '검색 결과가 없습니다' : '아이템이 없습니다'}
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
