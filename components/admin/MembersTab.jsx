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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-amber-900/20 flex-shrink-0">
        <span className="text-slate-400 text-sm">전체 {members.length}명</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 sticky top-0">
            <tr>
              <th className="text-left px-5 py-2.5 text-slate-400 font-medium">이메일</th>
              <th className="text-left px-4 py-2.5 text-slate-400 font-medium">가입일</th>
              <th className="text-left px-4 py-2.5 text-slate-400 font-medium">권한</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {members.map(member => {
              const isProcessing = processingId === member.id
              return (
                <tr key={member.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3 text-slate-200">{member.email}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(member.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      member.role === 'admin'
                        ? 'bg-amber-900/40 text-amber-400 border border-amber-700/40'
                        : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
                    }`}>
                      {member.role === 'admin' ? 'admin' : 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleRoleToggle(member)} disabled={isProcessing}
                        className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/40 px-2 py-1 rounded disabled:opacity-40">
                        {isProcessing ? '...' : member.role === 'admin' ? 'user로 변경' : 'admin으로 변경'}
                      </button>
                      <button onClick={() => handleDelete(member)} disabled={isProcessing}
                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-600/40 px-2 py-1 rounded disabled:opacity-40">
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
