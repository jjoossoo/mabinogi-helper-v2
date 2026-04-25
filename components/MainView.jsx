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
        <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-850 border-r border-amber-900/30 overflow-y-auto" style={{ backgroundColor: '#141c2b' }}>
          {/* 사이드바 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/30">
            <span className="text-amber-400 text-sm font-semibold tracking-wide">캐릭터</span>
            <button
              onClick={() => setShowModal(true)}
              title="캐릭터 추가"
              className="w-6 h-6 flex items-center justify-center rounded bg-amber-700 hover:bg-amber-600 text-white text-lg leading-none transition-colors"
            >
              +
            </button>
          </div>

          {/* 캐릭터 목록 */}
          <ul className="flex-1 py-2">
            {characters.length === 0 ? (
              <li className="px-4 py-8 text-center text-slate-500 text-sm">
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
                      className={`group w-full text-left px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-900/40 border-l-2 border-amber-500'
                          : 'border-l-2 border-transparent hover:bg-slate-700/40'
                      }`}
                    >
                      {/* 직업 아이콘 */}
                      <span className="text-xl flex-shrink-0">{cls?.emoji ?? '👤'}</span>

                      {/* 캐릭터 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium text-sm truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {char.name}
                          </span>
                          {char.is_main && (
                            <span className="text-amber-400 text-xs flex-shrink-0">★</span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs truncate">
                          {cls?.name ?? char.class} · Lv.{char.level} · {char.server}
                        </div>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(char) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs transition-all flex-shrink-0 p-1"
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
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-hidden">
          {/* 선택된 캐릭터 정보 배너 */}
          {selectedChar ? (
            <div className="px-6 py-3 bg-slate-800/60 border-b border-amber-900/20 flex items-center gap-3">
              <span className="text-2xl">{CLASS_MAP[selectedChar.class]?.emoji ?? '👤'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-100 font-semibold">{selectedChar.name}</span>
                  {selectedChar.is_main && <span className="text-amber-400 text-xs">대표</span>}
                </div>
                <div className="text-slate-400 text-xs">
                  {CLASS_MAP[selectedChar.class]?.name} · Lv.{selectedChar.level} · {selectedChar.server}
                  {selectedChar.memo && ` · ${selectedChar.memo}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-3 bg-slate-800/60 border-b border-amber-900/20 text-slate-500 text-sm">
              캐릭터를 선택하세요
            </div>
          )}

          {/* 탭 바 */}
          <div className="flex border-b border-amber-900/20 bg-slate-800/30">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-amber-400 border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedChar ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-5xl mb-3">⚔️</div>
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

