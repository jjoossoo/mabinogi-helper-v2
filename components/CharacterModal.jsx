'use client'

import { useState, useTransition } from 'react'
import { addCharacter } from '@/app/actions/characters'
import { CLASSES } from '@/data/classes'
import { SERVERS } from '@/data/servers'

const CLASS_GROUPS = CLASSES.reduce((acc, cls) => {
  if (!acc[cls.group]) acc[cls.group] = []
  acc[cls.group].push(cls)
  return acc
}, {})

export default function CharacterModal({ onSuccess, onClose }) {
  const [form, setForm] = useState({
    name: '',
    class: CLASSES[0].id,
    server: SERVERS[0],
    level: 0,
    memo: '',
    is_main: false,
  })
  const [isMax, setIsMax] = useState(false)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('캐릭터명을 입력해 주세요')
    setError(null)
    startTransition(async () => {
      const result = await addCharacter(form)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess(result.character)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel dots-bg w-full max-w-md rounded-xl overflow-hidden">
        {/* 모달 헤더 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.35)' }}
        >
          <h2 className="font-serif font-semibold tracking-wide" style={{ color: 'var(--gold-dark)' }}>
            ✦ 캐릭터 추가
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm rounded px-3 py-2" style={{
              background: 'rgba(139,32,32,0.1)',
              border: '1px solid var(--crimson)',
              color: 'var(--crimson-light)',
            }}>
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>캐릭터명 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="캐릭터 이름"
              maxLength={20}
              className="input-field w-full rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>직업</label>
              <select
                value={form.class}
                onChange={e => set('class', e.target.value)}
                className="input-field w-full rounded px-3 py-2 text-sm"
              >
                {Object.entries(CLASS_GROUPS).map(([group, list]) => (
                  <optgroup key={group} label={group}>
                    {list.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.emoji} {cls.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>서버</label>
              <select
                value={form.server}
                onChange={e => set('server', e.target.value)}
                className="input-field w-full rounded px-3 py-2 text-sm"
              >
                {SERVERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>레벨</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMax}
                  onChange={e => {
                    setIsMax(e.target.checked)
                    if (e.target.checked) set('level', 85)
                  }}
                  className="w-3.5 h-3.5"
                  style={{ accentColor: 'var(--sage)' }}
                />
                <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.6 }}>만렙 (85)</span>
              </label>
            </div>
            <input
              type="number"
              value={form.level}
              onChange={e => set('level', parseInt(e.target.value) || 0)}
              onFocus={e => e.target.select()}
              min={0} max={85}
              disabled={isMax}
              className="input-field w-full rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>메모</label>
            <textarea
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
              placeholder="간단한 메모"
              rows={2}
              maxLength={100}
              className="input-field w-full rounded px-3 py-2 text-sm resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_main}
              onChange={e => set('is_main', e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: 'var(--sage)' }}
            />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>대표 캐릭터로 설정</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-danger flex-1 py-2.5 rounded text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex-1 py-2.5 rounded text-sm"
            >
              {isPending ? '추가 중...' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
