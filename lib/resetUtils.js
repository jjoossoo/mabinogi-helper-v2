const KST = 9 * 60 * 60 * 1000

// 현재 KST 기준 가장 최근 초기화 시각 반환 (UTC Date 객체)
export function getLastResetTime(resetType, resetDay, resetHour) {
  if (!resetType || resetType === 'none') return null

  const nowKst = new Date(Date.now() + KST)

  if (resetType === 'daily') {
    const h = resetHour ?? 6
    const candidate = new Date(nowKst)
    candidate.setUTCHours(h, 0, 0, 0)
    if (nowKst < candidate) candidate.setUTCDate(candidate.getUTCDate() - 1)
    return new Date(candidate.getTime() - KST)
  }

  if (resetType === 'weekly') {
    const d = resetDay ?? 1
    const h = resetHour ?? 9
    const daysBack = (nowKst.getUTCDay() - d + 7) % 7
    const candidate = new Date(nowKst)
    candidate.setUTCHours(h, 0, 0, 0)
    candidate.setUTCDate(candidate.getUTCDate() - daysBack)
    if (nowKst < candidate) candidate.setUTCDate(candidate.getUTCDate() - 7)
    return new Date(candidate.getTime() - KST)
  }

  return null
}

// completedAt이 마지막 초기화 이후면 true
export function isCompleted(completedAt, resetType, resetDay, resetHour) {
  if (!completedAt) return false
  if (!resetType || resetType === 'none') return true
  const lastReset = getLastResetTime(resetType, resetDay, resetHour)
  if (!lastReset) return true
  return new Date(completedAt) >= lastReset
}
