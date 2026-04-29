'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { addConnection, deleteConnection, updateLocationPositions } from '@/app/actions/locations'

const NODE_R = 26
const CHILD_R = 18
const LABEL_MAX = 9
const GRID = 80 // world units between grid dots

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
    const x = loc.x ?? 160 + (i % cols) * 320
    const y = loc.y ?? 160 + Math.floor(i / cols) * 280
    parentPos[loc.id] = { x, y }
    result.push({ ...loc, x, y })
  })
  for (const [parentId, children] of Object.entries(childrenByParent)) {
    const p = parentPos[parentId] ?? { x: 160, y: 160 }
    children.forEach((loc, i) => {
      const angle = (2 * Math.PI * i) / children.length - Math.PI / 2
      result.push({
        ...loc,
        x: loc.x ?? Math.round(p.x + Math.cos(angle) * 110),
        y: loc.y ?? Math.round(p.y + Math.sin(angle) * 110),
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
    const xs = children.map(n => n.x), ys = children.map(n => n.y)
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

function drawScene(ctx, w, h, nodes, edges, connectFirstId, hoveredId, hoveredEdgeId, previewLine, view) {
  ctx.clearRect(0, 0, w, h)

  // Background (screen space)
  ctx.fillStyle = '#0d0905'
  ctx.fillRect(0, 0, w, h)

  // Infinite grid dots (screen space, offset by view)
  const gridStep = GRID * view.scale
  const ox = ((view.tx % gridStep) + gridStep) % gridStep
  const oy = ((view.ty % gridStep) + gridStep) % gridStep
  ctx.fillStyle = 'rgba(201,168,76,0.06)'
  for (let x = ox - gridStep; x < w + gridStep; x += gridStep) {
    for (let y = oy - gridStep; y < h + gridStep; y += gridStep) {
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
    }
  }

  if (!nodes.length) return

  // Apply world-space camera transform
  ctx.save()
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty)

  drawGroupBubbles(ctx, nodes)

  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

  // Preview line
  if (previewLine && connectFirstId) {
    const a = nm[connectFirstId]
    if (a) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(previewLine.x, previewLine.y)
      ctx.strokeStyle = 'rgba(201,168,76,0.3)'
      ctx.lineWidth = 1.5 / view.scale
      ctx.setLineDash([6 / view.scale, 5 / view.scale])
      ctx.stroke(); ctx.setLineDash([])
    }
  }

  // Edges
  for (const e of edges) {
    const a = nm[e.location_a_id], b = nm[e.location_b_id]
    if (!a || !b) continue
    const isHov = e.id === hoveredEdgeId
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = isHov ? '#e8c55a' : 'rgba(201,168,76,0.38)'
    ctx.lineWidth = (isHov ? 2.5 : 1.5) / view.scale
    ctx.setLineDash(isHov ? [] : [8 / view.scale, 5 / view.scale])
    ctx.stroke(); ctx.setLineDash([])

    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    const label = `${e.travel_time}분`
    const fs = 10 / view.scale
    ctx.font = `${fs}px sans-serif`
    const tw = ctx.measureText(label).width
    const pad = 4 / view.scale
    ctx.fillStyle = isHov ? 'rgba(30,22,8,0.95)' : 'rgba(17,12,4,0.8)'
    ctx.beginPath()
    ctx.roundRect(mx - tw / 2 - pad, my - fs * 0.8, tw + pad * 2, fs * 1.5, 4 / view.scale)
    ctx.fill()
    ctx.fillStyle = isHov ? '#e8c55a' : 'rgba(201,168,76,0.75)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, mx, my)
  }

  // Nodes
  for (const node of nodes) {
    const isSel = node.id === connectFirstId
    const isHov = node.id === hoveredId
    const isChild = !!node.parent_id
    const r = isChild ? CHILD_R : NODE_R
    const cx = node.x, cy = node.y

    if (isSel) {
      ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(201,168,76,0.12)'; ctx.fill()
    }

    ctx.save()
    ctx.shadowColor = isSel ? 'rgba(201,168,76,0.55)' : 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = (isSel ? 18 : 10) / view.scale
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = isSel ? 'rgba(60,44,12,0.95)'
      : isHov ? 'rgba(30,22,8,0.97)' : isChild ? 'rgba(20,15,5,0.88)' : 'rgba(17,12,4,0.92)'
    ctx.fill()
    ctx.strokeStyle = isSel ? '#c9a84c' : isHov ? 'rgba(245,237,214,0.65)' : isChild ? 'rgba(201,168,76,0.28)' : 'rgba(201,168,76,0.4)'
    ctx.lineWidth = (isSel ? 2.5 : isHov ? 2 : 1.5) / view.scale
    ctx.stroke()
    ctx.restore()

    ctx.font = `${(isChild ? 11 : 15) / view.scale}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = isChild ? 0.75 : 1
    ctx.fillText(node.emoji || '📍', cx, cy - (isChild ? 3 : 4))
    ctx.globalAlpha = 1

    const name = node.name.length > LABEL_MAX ? node.name.slice(0, LABEL_MAX - 1) + '…' : node.name
    ctx.font = `${isSel ? 'bold ' : ''}${(isChild ? 9 : 10) / view.scale}px sans-serif`
    ctx.fillStyle = isSel ? '#c9a84c' : isChild ? 'rgba(245,237,214,0.55)' : 'rgba(245,237,214,0.75)'
    ctx.fillText(name, cx, cy + r + 9)
  }

  ctx.restore()
}

export default function LocationMapEditor({ initialLocations, initialConnections }) {
  const [nodes, setNodes] = useState(() => autoLayout(initialLocations))
  const [edges, setEdges] = useState(initialConnections)
  const [mode, setMode] = useState('move')
  const [connectFirstId, setConnectFirstId] = useState(null)
  const [pendingConn, setPendingConn] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [previewLine, setPreviewLine] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [toast, setToast] = useState(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const dragRef = useRef(null)   // node drag: { nodeId, startX, startY, origX, origY, children }
  const panRef = useRef(null)    // canvas pan: { startX, startY, origTx, origTy }
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 })
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const dimsRef = useRef(dims)
  const [, startTransition] = useTransition()

  nodesRef.current = nodes
  edgesRef.current = edges
  dimsRef.current = dims

  // Responsive canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fit all nodes in view when dims first become available
  const fittedRef = useRef(false)
  useEffect(() => {
    if (dims.w === 0 || fittedRef.current) return
    fittedRef.current = true
    fitView()
  }, [dims])

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    drawScene(
      canvas.getContext('2d'), dimsRef.current.w, dimsRef.current.h,
      nodesRef.current, edgesRef.current,
      connectFirstId, hoveredId, hoveredEdgeId, previewLine, viewRef.current
    )
  }

  useEffect(() => { redraw() }, [nodes, edges, mode, connectFirstId, hoveredId, hoveredEdgeId, previewLine, dims])

  // Document-level mouseup
  useEffect(() => {
    function onUp() {
      if (dragRef.current) { setDirty(true); dragRef.current = null }
      panRef.current = null
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [])

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function onWheel(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const v = viewRef.current
      const newScale = Math.max(0.05, Math.min(10, v.scale * factor))
      viewRef.current = {
        scale: newScale,
        tx: cx - (cx - v.tx) * (newScale / v.scale),
        ty: cy - (cy - v.ty) * (newScale / v.scale),
      }
      redraw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [dims])

  function fitView() {
    const ns = nodesRef.current
    const { w, h } = dimsRef.current
    if (!ns.length || !w || !h) return
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const bw = (maxX - minX) || 200, bh = (maxY - minY) || 200
    const pad = 80
    const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 3)
    viewRef.current = { scale: s, tx: (w - bw * s) / 2 - minX * s, ty: (h - bh * s) / 2 - minY * s }
    redraw()
  }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const v = viewRef.current
    return { x: (sx - v.tx) / v.scale, y: (sy - v.ty) / v.scale, sx, sy }
  }

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 2500)
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    const pos = getPos(e)
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
    const node = getNodeAt(nodes, pos.x, pos.y)

    if (mode === 'move') {
      if (node) {
        const children = nodes.filter(n => n.parent_id === node.id).map(n => ({ id: n.id, origX: n.x, origY: n.y }))
        dragRef.current = { nodeId: node.id, startX: pos.x, startY: pos.y, origX: node.x, origY: node.y, children }
      } else {
        // Pan
        const v = viewRef.current
        panRef.current = { startX: pos.sx, startY: pos.sy, origTx: v.tx, origTy: v.ty }
      }
    } else if (mode === 'connect') {
      if (!node) { setConnectFirstId(null); setPreviewLine(null); return }
      if (!connectFirstId) { setConnectFirstId(node.id); return }
      if (node.id === connectFirstId) { setConnectFirstId(null); setPreviewLine(null); return }
      const a = nm[connectFirstId], b = node
      const already = edges.some(ed =>
        (ed.location_a_id === a.id && ed.location_b_id === b.id) ||
        (ed.location_a_id === b.id && ed.location_b_id === a.id)
      )
      if (already) { showToast('이미 연결된 지역입니다'); setConnectFirstId(null); setPreviewLine(null); return }
      setConnectFirstId(null); setPreviewLine(null)
      setPendingConn({ aId: a.id, bId: b.id, time: 1 })
    } else if (mode === 'delete-edge') {
      const edge = getEdgeAt(edges, nm, pos.x, pos.y)
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
    const pos = getPos(e)
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

    // Node drag
    if (dragRef.current) {
      const { nodeId, startX, startY, origX, origY, children } = dragRef.current
      const dx = pos.x - startX, dy = pos.y - startY
      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) return { ...n, x: origX + dx, y: origY + dy }
        const child = children?.find(c => c.id === n.id)
        if (child) return { ...n, x: child.origX + dx, y: child.origY + dy }
        return n
      }))
      return
    }

    // Pan
    if (panRef.current) {
      const { startX, startY, origTx, origTy } = panRef.current
      viewRef.current = {
        ...viewRef.current,
        tx: origTx + (pos.sx - startX),
        ty: origTy + (pos.sy - startY),
      }
      redraw()
      return
    }

    // Hover
    const node = getNodeAt(nodes, pos.x, pos.y)
    setHoveredId(node?.id ?? null)
    if (mode === 'connect' && connectFirstId) setPreviewLine({ x: pos.x, y: pos.y })
    if (mode === 'delete-edge' && !node) setHoveredEdgeId(getEdgeAt(edges, nm, pos.x, pos.y)?.id ?? null)
    else setHoveredEdgeId(null)
  }

  function handleMouseLeave() {
    setHoveredId(null); setHoveredEdgeId(null); setPreviewLine(null)
    panRef.current = null
  }

  async function handleSave() {
    setSaveStatus('saving')
    const positions = nodesRef.current.map(n => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) }))
    startTransition(async () => {
      const result = await updateLocationPositions(positions)
      if (result.error) { setSaveStatus('error'); showToast(result.error, true) }
      else { setSaveStatus('saved'); setDirty(false) }
      setTimeout(() => setSaveStatus(null), 2500)
    })
  }

  function changeMode(m) {
    setMode(m); setConnectFirstId(null); setPendingConn(null); setPreviewLine(null); setHoveredEdgeId(null)
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

  const isDraggingNode = !!dragRef.current
  const isPanning = !!panRef.current
  const cursor = isDraggingNode ? 'grabbing' : isPanning ? 'grabbing'
    : mode === 'connect' ? 'crosshair' : mode === 'delete-edge' ? 'default' : 'grab'

  const instruction = {
    move: '노드 드래그로 이동 · 빈 공간 드래그로 화면 이동 · 스크롤로 줌',
    connect: connectFirstId ? '두 번째 지역을 클릭하세요' : '연결할 첫 번째 지역을 클릭하세요',
    'delete-edge': '삭제할 연결선을 클릭하세요',
  }[mode]

  const pendingA = pendingConn ? nodesRef.current.find(n => n.id === pendingConn.aId) : null
  const pendingB = pendingConn ? nodesRef.current.find(n => n.id === pendingConn.bId) : null
  const zoomPct = Math.round(viewRef.current.scale * 100)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 flex-wrap gap-y-2"
        style={{ backgroundColor: 'var(--deep)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
        <span className="font-serif text-sm font-semibold flex-shrink-0" style={{ color: 'var(--gold)' }}>
          🗺 지도 에디터
        </span>

        <div className="flex gap-1">
          {[['move', '✥ 이동'], ['connect', '⟷ 연결'], ['delete-edge', '✕ 연결 삭제']].map(([m, label]) => (
            <button key={m} onClick={() => changeMode(m)} className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                backgroundColor: mode === m ? 'rgba(201,168,76,0.18)' : 'transparent',
                border: `1px solid ${mode === m ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`,
                color: mode === m ? 'var(--gold-light)' : 'var(--parchment)',
                fontWeight: mode === m ? 600 : 400,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => { viewRef.current = { ...viewRef.current, scale: Math.max(0.05, viewRef.current.scale / 1.3) }; redraw() }}
            className="px-2 py-1 rounded text-xs" style={{ border: '1px solid rgba(201,168,76,0.3)', color: 'var(--parchment)' }}>−</button>
          <span className="text-xs w-10 text-center" style={{ color: 'var(--parchment)', opacity: 0.55 }}>{zoomPct}%</span>
          <button onClick={() => { viewRef.current = { ...viewRef.current, scale: Math.min(10, viewRef.current.scale * 1.3) }; redraw() }}
            className="px-2 py-1 rounded text-xs" style={{ border: '1px solid rgba(201,168,76,0.3)', color: 'var(--parchment)' }}>+</button>
          <button onClick={fitView} className="px-2 py-1 rounded text-xs ml-1"
            style={{ border: '1px solid rgba(201,168,76,0.3)', color: 'var(--parchment)' }}>전체</button>
        </div>

        <div className="flex-1" />
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--parchment)', opacity: 0.4 }}>
          위치 {nodes.length} · 연결 {edges.length}
        </span>
        <button onClick={handleSave} disabled={saveStatus === 'saving'}
          className="btn-primary text-xs px-4 py-1.5 rounded flex-shrink-0"
          style={{ opacity: dirty || saveStatus ? 1 : 0.55 }}>
          {saveStatus === 'saving' ? '저장 중…' : saveStatus === 'saved' ? '✓ 저장됨' : saveStatus === 'error' ? '⚠ 오류' : '💾 위치 저장'}
        </button>
      </div>

      {/* Instruction bar */}
      <div className="px-4 py-1.5 text-xs flex-shrink-0 flex items-center gap-2"
        style={{ backgroundColor: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.12)', color: 'var(--parchment)', opacity: 0.6 }}>
        <span>{instruction}</span>
        {dirty && <span className="ml-auto" style={{ color: 'var(--gold-dark)', opacity: 0.8 }}>● 미저장 변경사항</span>}
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 relative" style={{ backgroundColor: '#0a0702' }}>
        <canvas
          ref={canvasRef}
          width={dims.w}
          height={dims.h}
          style={{ display: 'block', cursor }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Connection confirmation panel */}
        {pendingConn && pendingA && pendingB && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <div className="panel dots-bg rounded-xl px-6 py-5 flex flex-col gap-4 shadow-2xl"
              style={{ minWidth: '280px', border: '1.5px solid rgba(201,168,76,0.5)' }}>
              <p className="font-serif font-semibold text-sm text-center" style={{ color: 'var(--gold-dark)' }}>⟷ 연결 추가</p>
              <p className="text-sm text-center" style={{ color: 'var(--parchment)' }}>
                {pendingA.emoji} {pendingA.name}
                <span className="mx-2" style={{ opacity: 0.4 }}>↔</span>
                {pendingB.emoji} {pendingB.name}
              </p>
              <div className="flex items-center justify-center gap-2">
                <label className="text-xs" style={{ color: 'var(--ink)' }}>이동 시간</label>
                <input type="number" value={pendingConn.time} min={1} autoFocus
                  onChange={e => setPendingConn(p => ({ ...p, time: parseInt(e.target.value) || 1 }))}
                  onKeyDown={e => { if (e.key === 'Enter') confirmConnection(); if (e.key === 'Escape') setPendingConn(null) }}
                  onFocus={e => e.target.select()}
                  className="input-field w-20 rounded px-2 py-1.5 text-sm text-center" />
                <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.6 }}>분</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPendingConn(null)} className="btn-danger flex-1 py-2 rounded text-sm">취소</button>
                <button onClick={confirmConnection} className="btn-primary flex-1 py-2 rounded text-sm">연결</button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ color: 'var(--parchment)', opacity: 0.2 }}>
            <div className="text-5xl mb-3">🗺</div>
            <p className="text-sm">관리자 패널 → 위치 관리에서 지역을 먼저 추가하세요</p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm shadow-xl z-50 pointer-events-none"
          style={{
            backgroundColor: toast.isError ? 'rgba(139,32,32,0.95)' : 'rgba(30,22,8,0.97)',
            border: `1px solid ${toast.isError ? 'var(--crimson)' : 'rgba(201,168,76,0.5)'}`,
            color: toast.isError ? 'var(--crimson-light)' : 'var(--parchment)',
          }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
