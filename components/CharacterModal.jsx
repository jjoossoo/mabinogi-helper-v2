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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-slate-800 border border-amber-900/50 rounded-lg shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/30">
          <h2 className="text-amber-300 font-semibold tracking-wide">캐릭터 추가</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* 캐릭터명 */}
          <div>
            <label className="block text-slate-300 text-sm mb-1.5">캐릭터명 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="캐릭터 이름"
              maxLength={20}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* 직업 + 서버 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">직업</label>
              <select
                value={form.class}
                onChange={e => set('class', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {Object.entries(CLASS_GROUPS).map(([group, list]) => (
                  <optgroup key={group} label={group}>
                    {list.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.emoji} {cls.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">서버</label>
              <select
                value={form.server}
                onChange={e => set('server', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {SERVERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 레벨 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 text-sm">레벨</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMax}
                  onChange={e => {
                    setIsMax(e.target.checked)
                    if (e.target.checked) set('level', 85)
                  }}
                  className="w-3.5 h-3.5 accent-amber-500"
                />
                <span className="text-slate-400 text-xs">만렙 (85)</span>
              </label>
            </div>
            <input
              type="number"
              value={form.level}
              onChange={e => set('level', parseInt(e.target.value) || 0)}
              onFocus={e => e.target.select()}
              min={0}
              max={85}
              disabled={isMax}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-slate-300 text-sm mb-1.5">메모</label>
            <textarea
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
              placeholder="간단한 메모"
              rows={2}
              maxLength={100}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* 대표 캐릭터 */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_main}
              onChange={e => set('is_main', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-slate-300 text-sm">대표 캐릭터로 설정</span>
          </label>

          {/* 버튼 */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 rounded transition-colors text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded transition-colors text-sm"
            >
              {isPending ? '추가 중...' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
