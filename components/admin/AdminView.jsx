'use client'

import { useState } from 'react'
import ItemsTab from './ItemsTab'
import QuestsTab from './QuestsTab'
import MembersTab from './MembersTab'

const TABS = [
  { id: 'items', label: '아이템 관리' },
  { id: 'quests', label: '퀘스트/미션 관리' },
  { id: 'members', label: '회원 관리' },
]

export default function AdminView({ initialCategories, initialItems, initialQuests, initialMembers }) {
  const [activeTab, setActiveTab] = useState('items')
  const [categories, setCategories] = useState(initialCategories)
  const [items, setItems] = useState(initialItems)
  const [quests, setQuests] = useState(initialQuests)
  const [members, setMembers] = useState(initialMembers)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 관리자 헤더 */}
      <div className="bg-slate-800 border-b border-amber-900/30 px-6 py-3 flex items-center gap-3">
        <span className="text-amber-400 text-sm font-semibold">🔧 관리자 패널</span>
      </div>

      {/* 탭 바 */}
      <div className="flex border-b border-amber-900/20 bg-slate-800/30 px-4">
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
      <div className="flex-1 overflow-hidden">
        {activeTab === 'items' && (
          <ItemsTab
            categories={categories} setCategories={setCategories}
            items={items} setItems={setItems}
          />
        )}
        {activeTab === 'quests' && (
          <QuestsTab
            quests={quests} setQuests={setQuests}
            items={items}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab members={members} setMembers={setMembers} />
        )}
      </div>
    </div>
  )
}
