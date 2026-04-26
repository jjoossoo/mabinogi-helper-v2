'use client'

import { useState, useTransition } from 'react'
import { deleteCharacter } from '@/app/actions/characters'
import { CLASSES } from '@/data/classes'
import CharacterModal from './CharacterModal'
import QuestsPanel from './tabs/QuestsPanel'
import MaterialsPanel from './tabs/MaterialsPanel'

const CLASS_MAP = Object.fromEntries(CLASSES.map(c => [c.id, c]))

const TABS = [
  { id: 'quests', label: '퀘스트/미션' },
  { id: 'materials', label: '재료 계산기' },
]

export default function MainView({ initialCharacters }) {
  const [characters, setCharacters] = useState(initialCharacters)
  const [selectedId, setSelectedId] = useState(
    () => initialCharacters.find(c => c.is_main)?.id ?? initialCharacters[0]?.id ?? null
  )
  const [activeTab, setActiveTab] = useState('quests')
  const [showModal, setShowModal] = useState(false)
  const [, startTransition] = useTransition()

  const selectedChar = characters.find(c => c.id === selectedId)

  function handleAddSuccess(character) {
    setCharacters(prev => [...prev, character])
    setSelectedId(character.id)
    setShowModal(false)
  }

  function handleDelete(char) {
    setCharacters(prev => prev.filter(c => c.id !== char.id))
    if (selectedId === char.id) {
      const remaining = characters.filter(c => c.id !== char.id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    startTransition(async () => {
      await deleteCharacter(char.id)
    })
  }

  return (
    <>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 좌측 사이드바 */}
        <aside
          className="w-60 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{
            backgroundColor: '#110c04',
            borderRight: '1.5px solid rgba(201,168,76,0.35)',
          }}
        >
          {/* 사이드바 헤더 */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(201,168,76,0.25)' }}
          >
            <span className="font-serif font-semibold text-sm tracking-wide" style={{ color: 'var(--gold-dark)' }}>
              ✦ 캐릭터
            </span>
            <button
              onClick={() => setShowModal(true)}
              title="캐릭터 추가"
              className="btn-primary w-6 h-6 flex items-center justify-center rounded text-lg leading-none"
            >
              +
            </button>
          </div>

          {/* 캐릭터 목록 */}
          <ul className="flex-1 py-1">
            {characters.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm" style={{ color: 'var(--parchment)', opacity: 0.3 }}>
                <div className="text-3xl mb-2">🏰</div>
                캐릭터가 없습니다
              </li>
            ) : (
              characters.map(char => {
                const cls = CLASS_MAP[char.class]
                const isSelected = char.id === selectedId
                return (
                  <li key={char.id}>
                    <div
                      onClick={() => setSelectedId(char.id)}
                      className="group w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors"
                      style={{
                        borderLeft: `2px solid ${isSelected ? 'var(--gold)' : 'transparent'}`,
                        backgroundColor: isSelected ? 'rgba(201,168,76,0.12)' : 'transparent',
                      }}
                    >
                      <span className="text-xl flex-shrink-0">{cls?.emoji ?? '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-medium text-sm truncate"
                            style={{ color: isSelected ? 'var(--gold-light)' : 'var(--parchment)' }}
                          >
                            {char.name}
                          </span>
                          {char.is_main && (
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--gold)' }}>★</span>
                          )}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--parchment)', opacity: 0.38 }}>
                          {cls?.name ?? char.class} · Lv.{char.level} · {char.server}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(char) }}
                        className="opacity-0 group-hover:opacity-100 text-xs transition-all flex-shrink-0 p-1 hover:opacity-70"
                        style={{ color: 'var(--crimson-light)' }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        {/* 우측 메인 영역 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* 선택된 캐릭터 정보 배너 */}
          {selectedChar ? (
            <div
              className="px-5 py-2.5 flex items-center gap-3 flex-shrink-0"
              style={{
                background: 'rgba(245,237,214,0.06)',
                borderBottom: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              <span className="text-2xl">{CLASS_MAP[selectedChar.class]?.emoji ?? '👤'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parchment)' }}>
                    {selectedChar.name}
                  </span>
                  {selectedChar.is_main && (
                    <span className="text-xs font-medium" style={{ color: 'var(--gold)' }}>대표</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--parchment)', opacity: 0.45 }}>
                  {CLASS_MAP[selectedChar.class]?.name} · Lv.{selectedChar.level} · {selectedChar.server}
                  {selectedChar.memo && ` · ${selectedChar.memo}`}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="px-5 py-3 text-sm flex-shrink-0"
              style={{
                borderBottom: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--parchment)',
                opacity: 0.35,
              }}
            >
              캐릭터를 선택하세요
            </div>
          )}

          {/* 탭 바 */}
          <div
            className="flex flex-shrink-0"
            style={{
              backgroundColor: 'rgba(26,18,8,0.6)',
              borderBottom: '2px solid rgba(201,168,76,0.3)',
            }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm transition-colors ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedChar ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--parchment)', opacity: 0.25 }}>
                <div className="text-5xl mb-3">⚔</div>
                <p className="text-sm">좌측에서 캐릭터를 선택하거나 추가하세요</p>
              </div>
            ) : activeTab === 'quests' ? (
              <QuestsPanel characterId={selectedChar.id} />
            ) : (
              <MaterialsPanel />
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <CharacterModal
          onSuccess={handleAddSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
