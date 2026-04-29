'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { addConnection, deleteConnection, updateLocationPositions } from '@/app/actions/locations'

const NODE_R = 26
const CHILD_R = 18
const CANVAS_W = 1800
const CANVAS_H = 960
const LABEL_MAX = 9

function autoLayout(locations) {
  const parents = locations.filter(l => !l.parent_id)
  const childrenByParent = {}
  for (const l of locations) {
    if (l.parent_id) {
      if (!childrenByParent[l.parent_id]) childrenByParent[l.parent_id] = []
      childrenByParent[l.parent_id].push(l)
    }
  }

  const cols = Math.ceil(Math.sqrt(Math.max(parents.length, 1)))
  const result = []
  const parentPos = {}

  parents.forEach((loc, i) => {
    const x = loc.x ?? 140 + (i % cols) * 300
    const y = loc.y ?? 140 + Math.floor(i / cols) * 260
    parentPos[loc.id] = { x, y }
    result.push({ ...loc, x, y })
  })

  for (const [parentId, children] of Object.entries(childrenByParent)) {
    const p = parentPos[parentId] ?? { x: 140, y: 140 }
    children.forEach((loc, i) => {
      const angle = (2 * Math.PI * i) / children.length - Math.PI / 2
      const r = 100
      result.push({
        ...loc,
        x: loc.x ?? Math.round(p.x + Math.cos(angle) * r),
        y: loc.y ?? Math.round(p.y + Math.sin(angle) * r),
      })
    })
  }

  return result
}

function getNodeAt(nodes, x, y) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const r = nodes[i].parent_id ? CHILD_R : NODE_R
    if (Math.hypot(x - nodes[i].x, y - nodes[i].y) <= r) return nodes[i]
  }
  return null
}

function ptLineDist(px, py, x1, y1, x2, y2) {
  const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len2))
  return Math.hypot(px - x1 - t * (x2 - x1), py - y1 - t * (y2 - y1))
}

function getEdgeAt(edges, nodeMap, x, y) {
  for (const e of edges) {
    const a = nodeMap[e.location_a_id], b = nodeMap[e.location_b_id]
    if (a && b && ptLineDist(x, y, a.x, a.y, b.x, b.y) < 9) return e
  }
  return null
}

function drawGroupBubbles(ctx, nodes) {
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
  const groups = {}
  for (const n of nodes) {
    if (n.parent_id) {
      if (!groups[n.parent_id]) groups[n.parent_id] = []
      groups[n.parent_id].push(n)
    }
  }
  for (const [parentId, children] of Object.entries(groups)) {
    if (!children.length) continue
    const pad = CHILD_R + 22
    const xs = children.map(n => n.x)
    const ys = children.map(n => n.y)
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad
    ctx.beginPath()
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 24)
    ctx.fillStyle = 'rgba(201,168,76,0.05)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(201,168,76,0.22)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([7, 5])
    ctx.stroke()
    ctx.setLineDash([])
    // Parent label
    const parent = nm[parentId]
    if (parent) {
      ctx.font = '11px sans-serif'
      ctx.fillStyle = 'rgba(201,168,76,0.45)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${parent.emoji} ${parent.name}`, x0 + 9, y0 + 7)
    }
  }
}

function drawScene(ctx, nodes, edges, mode, connectFirstId, hoveredId, hoveredEdgeId, previewLine) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // Background
  ctx.fillStyle = '#0d0905'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Grid dots
  ctx.fillStyle = 'rgba(201,168,76,0.05)'
  for (let x = 0; x < CANVAS_W; x += 48) {
    for (let y = 0; y < CANVAS_H; y += 48) {
      ctx.beginPath()
      ctx.arc(x, y, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Region group bubbles (drawn before edges and nodes)
  drawGroupBubbles(ctx, nodes)

  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

  // Preview line in connect mode
  if (previewLine && connectFirstId) {
    const a = nm[connectFirstId]
    if (a) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(previewLine.x, previewLine.y)
      ctx.strokeStyle = 'rgba(201,168,76,0.3)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 5])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // Edges
  for (const e of edges) {
    const a = nm[e.location_a_id], b = nm[e.location_b_id]
    if (!a || !b) continue
    const isHov = e.id === hoveredEdgeId

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = isHov ? '#e8c55a' : 'rgba(201,168,76,0.38)'
    ctx.lineWidth = isHov ? 2.5 : 1.5
    ctx.setLineDash(isHov ? [] : [8, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // Travel time badge
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    const label = `${e.travel_time}분`
    ctx.font = '10px sans-serif'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = isHov ? 'rgba(30,22,8,0.95)' : 'rgba(17,12,4,0.8)'
    const pad = 4
    ctx.beginPath()
    ctx.roundRect(mx - tw / 2 - pad, my - 8, tw + pad * 2, 15, 4)
    ctx.fill()
    ctx.fillStyle = isHov ? '#e8c55a' : 'rgba(201,168,76,0.75)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, mx, my)
  }

  // Nodes
  for (const node of nodes) {
    const isSel = node.id === connectFirstId
    const isHov = node.id === hoveredId
    const isChild = !!node.parent_id
    const r = isChild ? CHILD_R : NODE_R
    const cx = node.x, cy = node.y

    // Selection ring
    if (isSel) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(201,168,76,0.12)'
      ctx.fill()
    }

    // Drop shadow
    ctx.save()
    ctx.shadowColor = isSel ? 'rgba(201,168,76,0.55)' : 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = isSel ? 18 : 10

    // Circle body
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = isSel
      ? 'rgba(60,44,12,0.95)'
      : isHov ? 'rgba(30,22,8,0.97)' : isChild ? 'rgba(20,15,5,0.88)' : 'rgba(17,12,4,0.92)'
    ctx.fill()
    ctx.strokeStyle = isSel ? '#c9a84c' : isHov ? 'rgba(245,237,214,0.65)' : isChild ? 'rgba(201,168,76,0.28)' : 'rgba(201,168,76,0.4)'
    ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1.5
    ctx.stroke()
    ctx.restore()

    // Emoji
    ctx.font = `${isChild ? 11 : 15}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = isChild ? 0.75 : 1
    ctx.fillText(node.emoji || '📍', cx, cy - (isChild ? 3 : 4))
    ctx.globalAlpha = 1

    // Name label below node
    const name = node.name.length > LABEL_MAX ? node.name.slice(0, LABEL_MAX - 1) + '…' : node.name
    ctx.font = `${isSel ? 'bold ' : ''}${isChild ? 9 : 10}px sans-serif`
    ctx.fillStyle = isSel ? '#c9a84c' : isChild ? 'rgba(245,237,214,0.55)' : 'rgba(245,237,214,0.75)'
    ctx.fillText(name, cx, cy + r + 9)
  }
}

export default function LocationMapEditor({ initialLocations, initialConnections }) {
  const [nodes, setNodes] = useState(() => autoLayout(initialLocations))
  const [edges, setEdges] = useState(initialConnections)
  const [mode, setMode] = useState('move')
  const [connectFirstId, setConnectFirstId] = useState(null)
  const [pendingConn, setPendingConn] = useState(null) // { aId, bId, time }
  const [hoveredId, setHoveredId] = useState(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [previewLine, setPreviewLine] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [toast, setToast] = useState(null)

  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const [, startTransition] = useTransition()

  // Keep refs in sync for mouse handlers (avoid stale closures)
  nodesRef.current = nodes
  edgesRef.current = edges

  // Redraw whenever relevant state changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawScene(ctx, nodes, edges, mode, connectFirstId, hoveredId, hoveredEdgeId, previewLine)
  }, [nodes, edges, mode, connectFirstId, hoveredId, hoveredEdgeId, previewLine])

  // Document-level mouseup to catch drags that leave the canvas
  useEffect(() => {
    function onUp() {
      if (dragRef.current) {
        setDirty(true)
        dragRef.current = null
      }
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 2500)
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    const { x, y } = getPos(e)
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
    const node = getNodeAt(nodes, x, y)

    if (mode === 'move') {
      if (node) {
        // If dragging a parent node, carry all its children along
        const children = nodes
          .filter(n => n.parent_id === node.id)
          .map(n => ({ id: n.id, origX: n.x, origY: n.y }))
        dragRef.current = { nodeId: node.id, startX: x, startY: y, origX: node.x, origY: node.y, children }
      }
    } else if (mode === 'connect') {
      if (!node) { setConnectFirstId(null); setPreviewLine(null); return }
      if (!connectFirstId) {
        setConnectFirstId(node.id)
        return
      }
      if (node.id === connectFirstId) {
        setConnectFirstId(null); setPreviewLine(null); return
      }
      // Show confirmation panel instead of saving immediately
      const a = nm[connectFirstId], b = node
      const already = edges.some(ed =>
        (ed.location_a_id === a.id && ed.location_b_id === b.id) ||
        (ed.location_a_id === b.id && ed.location_b_id === a.id)
      )
      if (already) {
        showToast('이미 연결된 지역입니다')
        setConnectFirstId(null); setPreviewLine(null); return
      }
      setConnectFirstId(null); setPreviewLine(null)
      setPendingConn({ aId: a.id, bId: b.id, time: 1 })
    } else if (mode === 'delete-edge') {
      const edge = getEdgeAt(edges, nm, x, y)
      if (edge) {
        const a = nm[edge.location_a_id], b = nm[edge.location_b_id]
        startTransition(async () => {
          const result = await deleteConnection(edge.id)
          if (result.error) { showToast(result.error, true); return }
          setEdges(prev => prev.filter(ed => ed.id !== edge.id))
          showToast(`${a?.name ?? '?'} ↔ ${b?.name ?? '?'} 연결 삭제`)
        })
      }
    }
  }

  function handleMouseMove(e) {
    const { x, y } = getPos(e)
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

    // Drag
    if (dragRef.current && mode === 'move') {
      const { nodeId, startX, startY, origX, origY, children } = dragRef.current
      const dx = x - startX
      const dy = y - startY
      const nx = Math.max(NODE_R, Math.min(CANVAS_W - NODE_R, origX + dx))
      const ny = Math.max(NODE_R, Math.min(CANVAS_H - NODE_R, origY + dy))
      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) return { ...n, x: nx, y: ny }
        const child = children?.find(c => c.id === n.id)
        if (child) return { ...n, x: child.origX + dx, y: child.origY + dy }
        return n
      }))
      return
    }

    // Hover detection
    const node = getNodeAt(nodes, x, y)
    setHoveredId(node?.id ?? null)

    if (mode === 'connect' && connectFirstId) {
      setPreviewLine({ x, y })
    }

    if (mode === 'delete-edge' && !node) {
      const edge = getEdgeAt(edges, nm, x, y)
      setHoveredEdgeId(edge?.id ?? null)
    } else {
      setHoveredEdgeId(null)
    }
  }

  function handleMouseLeave() {
    setHoveredId(null)
    setHoveredEdgeId(null)
    setPreviewLine(null)
  }

  async function handleSave() {
    setSaveStatus('saving')
    const positions = nodesRef.current.map(n => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) }))
    startTransition(async () => {
      const result = await updateLocationPositions(positions)
      if (result.error) {
        setSaveStatus('error')
        showToast(result.error, true)
      } else {
        setSaveStatus('saved')
        setDirty(false)
      }
      setTimeout(() => setSaveStatus(null), 2500)
    })
  }

  function changeMode(m) {
    setMode(m)
    setConnectFirstId(null)
    setPendingConn(null)
    setPreviewLine(null)
    setHoveredEdgeId(null)
  }

  function confirmConnection() {
    const nodes = nodesRef.current
    const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
    const a = nm[pendingConn.aId], b = nm[pendingConn.bId]
    const travel_time = Math.max(1, pendingConn.time)
    setPendingConn(null)
    startTransition(async () => {
      const result = await addConnection({ location_a_id: a.id, location_b_id: b.id, travel_time })
      if (result.error) { showToast(result.error, true); return }
      setEdges(prev => [...prev, result.connection])
      showToast(`${a.name} ↔ ${b.name} 연결 (${travel_time}분)`)
    })
  }

  const cursorMap = { move: 'grab', connect: 'crosshair', 'delete-edge': 'default' }

  const instruction = {
    move: '노드를 드래그해 위치를 조정하고 [위치 저장]으로 확정하세요',
    connect: connectFirstId ? '두 번째 지역을 클릭하세요' : '연결할 첫 번째 지역을 클릭하세요',
    'delete-edge': '삭제할 연결선을 클릭하세요',
  }[mode]

  const pendingA = pendingConn ? nodesRef.current.find(n => n.id === pendingConn.aId) : null
  const pendingB = pendingConn ? nodesRef.current.find(n => n.id === pendingConn.bId) : null

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0 flex-wrap gap-y-2"
        style={{ backgroundColor: 'var(--deep)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}
      >
        <span className="font-serif text-sm font-semibold flex-shrink-0" style={{ color: 'var(--gold)' }}>
          🗺 지도 에디터
        </span>

        {/* Mode buttons */}
        <div className="flex gap-1">
          {[
            ['move', '✥ 이동'],
            ['connect', '⟷ 연결'],
            ['delete-edge', '✕ 연결 삭제'],
          ].map(([m, label]) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                backgroundColor: mode === m ? 'rgba(201,168,76,0.18)' : 'transparent',
                border: `1px solid ${mode === m ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`,
                color: mode === m ? 'var(--gold-light)' : 'var(--parchment)',
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Stat badges */}
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--parchment)', opacity: 0.4 }}>
          지역 {nodes.length} · 연결 {edges.length}
        </span>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary text-xs px-4 py-1.5 rounded flex-shrink-0"
          style={{ opacity: dirty || saveStatus ? 1 : 0.55 }}
        >
          {saveStatus === 'saving' ? '저장 중…' : saveStatus === 'saved' ? '✓ 저장됨' : saveStatus === 'error' ? '⚠ 오류' : '💾 위치 저장'}
        </button>
      </div>

      {/* Instruction bar */}
      <div
        className="px-4 py-1.5 text-xs flex-shrink-0 flex items-center gap-2"
        style={{ backgroundColor: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.12)', color: 'var(--parchment)', opacity: 0.6 }}
      >
        <span>{instruction}</span>
        {dirty && (
          <span className="ml-auto" style={{ color: 'var(--gold-dark)', opacity: 0.8 }}>● 미저장 변경사항</span>
        )}
      </div>

      {/* Canvas container */}
      <div className="flex-1 overflow-auto relative" style={{ backgroundColor: '#0a0702' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block',
            cursor: dragRef.current ? 'grabbing' : cursorMap[mode],
            // Scale canvas to fit within container width on small screens
            maxWidth: '100%',
            height: 'auto',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Connection confirmation panel */}
      {pendingConn && pendingA && pendingB && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <div
            className="panel dots-bg rounded-xl px-6 py-5 flex flex-col gap-4 shadow-2xl"
            style={{ minWidth: '280px', border: '1.5px solid rgba(201,168,76,0.5)' }}
          >
            <p className="font-serif font-semibold text-sm text-center" style={{ color: 'var(--gold-dark)' }}>
              ⟷ 연결 추가
            </p>
            <p className="text-sm text-center" style={{ color: 'var(--parchment)' }}>
              {pendingA.emoji} {pendingA.name}
              <span className="mx-2" style={{ opacity: 0.4 }}>↔</span>
              {pendingB.emoji} {pendingB.name}
            </p>
            <div className="flex items-center justify-center gap-2">
              <label className="text-xs" style={{ color: 'var(--ink)' }}>이동 시간</label>
              <input
                type="number"
                value={pendingConn.time}
                min={1}
                autoFocus
                onChange={e => setPendingConn(p => ({ ...p, time: parseInt(e.target.value) || 1 }))}
                onKeyDown={e => { if (e.key === 'Enter') confirmConnection(); if (e.key === 'Escape') setPendingConn(null) }}
                onFocus={e => e.target.select()}
                className="input-field w-20 rounded px-2 py-1.5 text-sm text-center"
              />
              <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.6 }}>분</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPendingConn(null)}
                className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
              <button onClick={confirmConnection}
                className="btn-primary flex-1 py-2 rounded text-sm">연결</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {nodes.length === 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ color: 'var(--parchment)', opacity: 0.2 }}
        >
          <div className="text-5xl mb-3">🗺</div>
          <p className="text-sm">관리자 패널 → 위치 관리에서 지역을 먼저 추가하세요</p>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm shadow-xl z-50 pointer-events-none"
          style={{
            backgroundColor: toast.isError ? 'rgba(139,32,32,0.95)' : 'rgba(30,22,8,0.97)',
            border: `1px solid ${toast.isError ? 'var(--crimson)' : 'rgba(201,168,76,0.5)'}`,
            color: toast.isError ? 'var(--crimson-light)' : 'var(--parchment)',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
