'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { buildGraph, calculateRoute } from '@/lib/routeCalculator'
import { isCompleted } from '@/lib/resetUtils'
import { CLASSES } from '@/data/classes'

const CLASS_MAP = Object.fromEntries(CLASSES.map(c => [c.id, c]))

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
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded shadow-xl"
          style={{ backgroundColor: 'var(--panel-bg)', border: '1.5px solid var(--gold)' }}>
          {filtered.map(opt => (
            <li key={opt.value}>
              <button type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(opt); setEditing(false); setQuery('') }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[rgba(201,168,76,0.1)]"
                style={{ color: 'var(--ink)', borderBottom: '1px solid rgba(138,106,31,0.1)' }}>
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

export default function RoutePlannerView({ initialCharacters, locations, connections, dungeons, trades, tradeProgress }) {
  const defaultCharId = initialCharacters.find(c => c.is_main)?.id ?? initialCharacters[0]?.id ?? null
  const [selectedCharId, setSelectedCharId] = useState(defaultCharId)
  const [startLocationId, setStartLocationId] = useState('')
  const [checkedTradeIds, setCheckedTradeIds] = useState(new Set())
  const [checkedDungeonIds, setCheckedDungeonIds] = useState(new Set())
  const [manualLocationIds, setManualLocationIds] = useState([])
  const [route, setRoute] = useState(null)

  const selectedChar = initialCharacters.find(c => c.id === selectedCharId)

  const locationMap = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l])), [locations])
  const tradesMap = useMemo(() => Object.fromEntries(trades.map(t => [t.id, t])), [trades])
  const dungeonsMap = useMemo(() => Object.fromEntries(dungeons.map(d => [d.id, d])), [dungeons])
  const graph = useMemo(() => buildGraph(connections), [connections])

  const progressMap = useMemo(() => {
    if (!selectedChar) return {}
    return Object.fromEntries(
      tradeProgress
        .filter(p => p.character_id === selectedChar.id || (!p.character_id && p.server === selectedChar.server))
        .map(p => [p.trade_id, p])
    )
  }, [selectedChar, tradeProgress])

  const incompleteTrades = useMemo(() => {
    return trades.filter(t => {
      const prog = progressMap[t.id]
      if (!prog) return true
      if (t.reset_type === 'none') return !prog.completed
      return !isCompleted(prog.completed_at, t.reset_type, t.reset_day, t.reset_hour)
    })
  }, [trades, progressMap])

  // Auto-check incomplete trades when character changes
  useEffect(() => {
    setCheckedTradeIds(new Set(incompleteTrades.map(t => t.id)))
    setRoute(null)
  }, [selectedCharId])

  const destinationLocIds = useMemo(() => {
    const locs = new Set()
    for (const tid of checkedTradeIds) {
      const t = tradesMap[tid]
      if (t?.location_info?.id) locs.add(t.location_info.id)
    }
    for (const did of checkedDungeonIds) {
      const d = dungeonsMap[did]
      if (d?.location?.id) locs.add(d.location.id)
    }
    for (const lid of manualLocationIds) locs.add(lid)
    return [...locs]
  }, [checkedTradeIds, checkedDungeonIds, manualLocationIds, tradesMap, dungeonsMap])

  const dungeonsWithLocation = useMemo(() => dungeons.filter(d => d.location?.id), [dungeons])

  function handleCalculate() {
    if (!startLocationId || destinationLocIds.length === 0) return
    const result = calculateRoute(graph, startLocationId, destinationLocIds)
    setRoute(result)
  }

  function addManualLocation(locId) {
    if (!locId || manualLocationIds.includes(locId)) return
    setManualLocationIds(prev => [...prev, locId])
  }

  function getTasksAtLocation(locId) {
    const tasks = []
    for (const tid of checkedTradeIds) {
      const t = tradesMap[tid]
      if (t?.location_info?.id === locId) {
        tasks.push(`${t.npc_name}: ${t.give_item?.emoji ?? ''} ${t.give_item?.name ?? ''} ×${t.give_amount}`)
      }
    }
    for (const did of checkedDungeonIds) {
      const d = dungeonsMap[did]
      if (d?.location?.id === locId) tasks.push(`${d.emoji} ${d.name}`)
    }
    if (manualLocationIds.includes(locId)) tasks.push('수동 목적지')
    return tasks
  }

  const locationOptions = locations.map(l => ({ value: l.id, label: l.name, emoji: l.emoji }))
  const startLocation = locationMap[startLocationId]
  const canCalculate = !!startLocationId && destinationLocIds.length > 0

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Left panel */}
      <div
        className="md:w-80 lg:w-96 flex-shrink-0 md:overflow-y-auto"
        style={{ backgroundColor: '#110c04', borderRight: '1.5px solid rgba(201,168,76,0.35)', borderBottom: '1.5px solid rgba(201,168,76,0.35)' }}
      >
        <div className="p-4 space-y-5">
          {/* Header */}
          <div>
            <h2 className="font-serif font-semibold text-sm" style={{ color: 'var(--gold)' }}>🗺 최적 경로 계산</h2>
          </div>

          {/* Character selector */}
          {initialCharacters.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--gold-dark)' }}>캐릭터</label>
              <div className="flex flex-wrap gap-1.5">
                {initialCharacters.map(char => {
                  const cls = CLASS_MAP[char.class]
                  const isSel = char.id === selectedCharId
                  return (
                    <button key={char.id} onClick={() => setSelectedCharId(char.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: isSel ? 'rgba(201,168,76,0.15)' : 'transparent',
                        border: `1px solid ${isSel ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`,
                        color: isSel ? 'var(--gold-light)' : 'var(--parchment)',
                      }}>
                      <span>{cls?.emoji ?? '👤'}</span>
                      <span>{char.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Start location */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gold-dark)' }}>시작 위치 *</label>
            <SearchSelect
              selectedLabel={startLocation ? `${startLocation.emoji} ${startLocation.name}` : ''}
              onSelect={opt => setStartLocationId(opt.value)}
              options={locationOptions}
              placeholder="시작 위치 선택..."
            />
          </div>

          {/* Incomplete trades */}
          {incompleteTrades.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gold-dark)' }}>
                오늘의 미완료 교환 ({incompleteTrades.length})
              </label>
              <div className="space-y-0.5">
                {incompleteTrades.map(t => (
                  <label key={t.id} className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded transition-colors hover:bg-[rgba(201,168,76,0.05)]">
                    <input type="checkbox"
                      checked={checkedTradeIds.has(t.id)}
                      onChange={e => {
                        setCheckedTradeIds(prev => {
                          const next = new Set(prev)
                          e.target.checked ? next.add(t.id) : next.delete(t.id)
                          return next
                        })
                      }}
                      style={{ accentColor: 'var(--sage)', marginTop: '2px' }}
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-xs leading-snug" style={{ color: 'var(--parchment)' }}>
                      <span style={{ opacity: 0.45 }}>{t.location_info?.emoji} {t.location_info?.name} · </span>
                      {t.npc_name}: {t.give_item?.emoji} {t.give_item?.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dungeons */}
          {dungeonsWithLocation.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gold-dark)' }}>던전 / 필드보스</label>
              <div className="space-y-0.5">
                {dungeonsWithLocation.map(d => (
                  <label key={d.id} className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded transition-colors hover:bg-[rgba(201,168,76,0.05)]">
                    <input type="checkbox"
                      checked={checkedDungeonIds.has(d.id)}
                      onChange={e => {
                        setCheckedDungeonIds(prev => {
                          const next = new Set(prev)
                          e.target.checked ? next.add(d.id) : next.delete(d.id)
                          return next
                        })
                      }}
                      style={{ accentColor: 'var(--sage)', marginTop: '2px' }}
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-xs leading-snug" style={{ color: 'var(--parchment)' }}>
                      <span style={{ opacity: 0.45 }}>{d.location?.emoji} {d.location?.name} · </span>
                      {d.emoji} {d.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Manual destinations */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gold-dark)' }}>추가 목적지</label>
            {manualLocationIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {manualLocationIds.map(lid => {
                  const loc = locationMap[lid]
                  return (
                    <span key={lid} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: 'var(--gold-dark)' }}>
                      {loc?.emoji} {loc?.name}
                      <button onClick={() => setManualLocationIds(p => p.filter(id => id !== lid))}
                        className="ml-0.5 hover:opacity-70" style={{ color: 'var(--crimson-light)' }}>✕</button>
                    </span>
                  )
                })}
              </div>
            )}
            <SearchSelect
              selectedLabel=""
              onSelect={opt => addManualLocation(opt.value)}
              options={locationOptions.filter(o => !manualLocationIds.includes(o.value))}
              placeholder="위치 추가..."
            />
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="btn-primary w-full py-3 rounded text-sm font-semibold"
            style={{ opacity: canCalculate ? 1 : 0.4 }}
          >
            🗺 경로 계산하기
          </button>

          {!canCalculate && (
            <p className="text-xs text-center" style={{ color: 'var(--parchment)', opacity: 0.4 }}>
              {!startLocationId ? '시작 위치를 선택해주세요' : '방문할 목적지를 하나 이상 선택해주세요'}
            </p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 md:overflow-y-auto p-4 md:p-6">
        {!route ? (
          <div className="flex flex-col items-center justify-center h-full min-h-48"
            style={{ color: 'var(--parchment)', opacity: 0.25 }}>
            <div className="text-5xl mb-3">🗺</div>
            <p className="text-sm text-center">목적지를 선택하고 경로를 계산하세요</p>
          </div>
        ) : route.segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-48"
            style={{ color: 'var(--parchment)', opacity: 0.4 }}>
            <p className="text-sm text-center">경로를 계산할 수 없습니다.<br />지역 연결 설정을 확인해주세요.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-xl">
            {/* Summary */}
            <div className="px-4 py-3 rounded-lg"
              style={{ backgroundColor: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <span className="font-serif font-semibold text-sm" style={{ color: 'var(--gold-dark)' }}>
                총 이동 시간: {route.totalTime}분
              </span>
              <span className="ml-3 text-xs" style={{ color: 'var(--parchment)', opacity: 0.55 }}>
                {route.segments.length}개 구간 · {destinationLocIds.length}개 목적지
              </span>
            </div>

            {/* Start */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ backgroundColor: 'rgba(74,124,95,0.2)', border: '1.5px solid var(--sage)', color: 'var(--sage)' }}>
                출
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--parchment)' }}>
                {startLocation?.emoji} {startLocation?.name}
              </span>
            </div>

            {/* Segments */}
            {route.segments.map((seg, idx) => {
              const toLoc = locationMap[seg.to]
              const tasks = getTasksAtLocation(seg.to)
              const via = seg.path.slice(1, -1).map(id => locationMap[id]).filter(Boolean)
              const unreachable = seg.time === Infinity || seg.time >= 1e9

              return (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0 pt-0">
                    <div className="w-px flex-none mt-1" style={{ height: '16px', backgroundColor: 'rgba(201,168,76,0.25)' }} />
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: unreachable ? 'rgba(139,32,32,0.15)' : 'rgba(201,168,76,0.12)', border: `1.5px solid ${unreachable ? 'var(--crimson)' : 'var(--gold)'}`, color: unreachable ? 'var(--crimson-light)' : 'var(--gold-dark)' }}>
                      {idx + 1}
                    </div>
                  </div>
                  <div className="pb-3 flex-1 pt-4">
                    {via.length > 0 && (
                      <div className="mb-1 text-xs" style={{ color: 'var(--parchment)', opacity: 0.38 }}>
                        경유: {via.map(l => `${l.emoji} ${l.name}`).join(' → ')}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--parchment)' }}>
                        {toLoc?.emoji} {toLoc?.name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={unreachable
                          ? { background: 'rgba(139,32,32,0.1)', border: '1px solid rgba(139,32,32,0.4)', color: 'var(--crimson-light)' }
                          : { background: 'rgba(74,124,95,0.1)', border: '1px solid rgba(74,124,95,0.3)', color: 'var(--sage)' }}>
                        {unreachable ? '도달 불가' : `${seg.time}분`}
                      </span>
                    </div>
                    {tasks.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {tasks.map((task, i) => (
                          <li key={i} className="text-xs" style={{ color: 'var(--parchment)', opacity: 0.6 }}>• {task}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
