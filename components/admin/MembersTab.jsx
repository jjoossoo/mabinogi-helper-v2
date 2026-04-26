'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, deleteUser } from '@/app/actions/admin'

export default function MembersTab({ members, setMembers }) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState(null)

  function handleRoleToggle(member) {
    const newRole = member.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`${member.email}의 권한을 '${newRole}'로 변경할까요?`)) return
    setProcessingId(member.id)
    startTransition(async () => {
      const result = await updateUserRole(member.id, newRole)
      if (!result.error) {
        setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
      }
      setProcessingId(null)
    })
  }

  function handleDelete(member) {
    if (!confirm(`${member.email} 계정을 강제 탈퇴시킬까요? 이 작업은 취소할 수 없습니다.`)) return
    setProcessingId(member.id)
    startTransition(async () => {
      const result = await deleteUser(member.id)
      if (!result.error) {
        setMembers(prev => prev.filter(m => m.id !== member.id))
      }
      setProcessingId(null)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}>
        <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>전체 {members.length}명</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto dots-bg">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--parchment-dark)' }}>
            <tr>
              <th className="text-left px-5 py-2.5 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>이메일</th>
              <th className="text-left px-4 py-2.5 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>가입일</th>
              <th className="text-left px-4 py-2.5 font-semibold font-serif" style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,31,0.3)' }}>권한</th>
              <th className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(138,106,31,0.3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => {
              const isProcessing = processingId === member.id
              return (
                <tr
                  key={member.id}
                  className="transition-colors"
                  style={{
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(138,106,31,0.04)',
                    borderBottom: '1px solid rgba(138,106,31,0.15)',
                  }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--ink)' }}>{member.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink)', opacity: 0.55 }}>
                    {new Date(member.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={member.role === 'admin'
                        ? { background: 'rgba(201,168,76,0.18)', color: 'var(--gold-dark)', border: '1px solid var(--gold)' }
                        : { background: 'rgba(45,31,10,0.08)', color: 'var(--ink)', opacity: 0.6, border: '1px solid rgba(138,106,31,0.3)' }
                      }
                    >
                      {member.role === 'admin' ? 'admin' : 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleRoleToggle(member)} disabled={isProcessing}
                        className="btn-ghost-sm px-2 py-1 rounded"
                      >
                        {isProcessing ? '...' : member.role === 'admin' ? 'user로 변경' : 'admin으로 변경'}
                      </button>
                      <button
                        onClick={() => handleDelete(member)} disabled={isProcessing}
                        className="btn-danger text-xs px-2 py-1 rounded"
                      >
                        강제 탈퇴
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
