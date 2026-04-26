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
      <div
        className="px-6 py-3 flex items-center gap-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--deep)',
          borderBottom: '1px solid rgba(201,168,76,0.3)',
        }}
      >
        <span className="font-serif font-semibold text-sm tracking-wide" style={{ color: 'var(--gold)' }}>
          🔧 관리자 패널
        </span>
      </div>

      {/* 탭 바 */}
      <div
        className="flex px-4 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(26,18,8,0.7)',
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
