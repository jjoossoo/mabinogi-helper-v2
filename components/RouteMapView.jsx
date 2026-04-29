'use client'

import { useRef, useEffect, useState, useMemo } from 'react'

function withAutoLayout(locations) {
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
    const x = loc.x ?? 100 + (i % cols) * 220
    const y = loc.y ?? 100 + Math.floor(i / cols) * 180
    parentPos[loc.id] = { x, y }
    result.push({ ...loc, x, y })
  })
  for (const [parentId, children] of Object.entries(childrenByParent)) {
    const p = parentPos[parentId] ?? { x: 100, y: 100 }
    children.forEach((loc, i) => {
      const angle = (2 * Math.PI * i) / children.length - Math.PI / 2
      result.push({
        ...loc,
        x: loc.x ?? Math.round(p.x + Math.cos(angle) * 90),
        y: loc.y ?? Math.round(p.y + Math.sin(angle) * 90),
      })
    })
  }
  return result
}

function fitTransform(nodes, w, h, pad = 60) {
  if (!nodes.length || w === 0 || h === 0) return { s: 1, tx: 0, ty: 0 }
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const bw = (maxX - minX) || 200
  const bh = (maxY - minY) || 200
  const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 2)
  return { s, tx: (w - bw * s) / 2 - minX * s, ty: (h - bh * s) / 2 - minY * s }
}

function drawArrow(ctx, ax, ay, bx, by, color, size) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const angle = Math.atan2(by - ay, bx - ax)
  ctx.save()
  ctx.translate(mx, my)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(size * 0.5, 0)
  ctx.lineTo(-size * 0.5, -size * 0.45)
  ctx.lineTo(-size * 0.5, size * 0.45)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

const NODE_R = 24, CHILD_R = 17

function draw(ctx, w, h, nodes, connections, route, startId, destIds, view) {
  const { s, tx, ty } = view
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = '#0d0905'
  ctx.fillRect(0, 0, w, h)

  // Infinite grid in screen space
  const gs = 44
  const ox = ((tx % gs) + gs) % gs
  const oy = ((ty % gs) + gs) % gs
  ctx.fillStyle = 'rgba(201,168,76,0.05)'
  for (let x = ox - gs; x < w + gs; x += gs) {
    for (let y = oy - gs; y < h + gs; y += gs) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
    }
  }

  if (!nodes.length) return

  ctx.setTransform(s, 0, 0, s, tx, ty)

  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

  // Group bubbles
  const groups = {}
  for (const n of nodes) {
    if (n.parent_id) {
      if (!groups[n.parent_id]) groups[n.parent_id] = []
      groups[n.parent_id].push(n)
    }
  }
  for (const [parentId, children] of Object.entries(groups)) {
    if (!children.length) continue
    const pad = CHILD_R + 14 / s
    const cxs = children.map(n => n.x)
    const cys = children.map(n => n.y)
    const x0 = Math.min(...cxs) - pad, x1 = Math.max(...cxs) + pad
    const y0 = Math.min(...cys) - pad, y1 = Math.max(...cys) + pad
    ctx.beginPath()
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 16 / s)
    ctx.fillStyle = 'rgba(201,168,76,0.05)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 1 / s
    ctx.setLineDash([5 / s, 4 / s])
    ctx.stroke()
    ctx.setLineDash([])
    const parent = nm[parentId]
    if (parent) {
      ctx.font = `${11 / s}px sans-serif`
      ctx.fillStyle = 'rgba(201,168,76,0.4)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${parent.emoji} ${parent.name}`, x0 + 7 / s, y0 + 5 / s)
    }
  }

  // Build route edge set
  const routeEdgeKey = new Set()
  const pathSegments = []
  if (route) {
    for (const seg of route.segments) {
      for (let i = 0; i < seg.path.length - 1; i++) {
        const a = nm[seg.path[i]], b = nm[seg.path[i + 1]]
        if (!a || !b) continue
        routeEdgeKey.add(`${seg.path[i]}|${seg.path[i + 1]}`)
        routeEdgeKey.add(`${seg.path[i + 1]}|${seg.path[i]}`)
        pathSegments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y })
      }
    }
  }

  // Faint background edges
  for (const conn of connections) {
    const a = nm[conn.location_a_id], b = nm[conn.location_b_id]
    if (!a || !b) continue
    if (routeEdgeKey.has(`${conn.location_a_id}|${conn.location_b_id}`)) continue
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = 'rgba(201,168,76,0.1)'
    ctx.lineWidth = 1 / s
    ctx.setLineDash([4 / s, 5 / s]); ctx.stroke(); ctx.setLineDash([])
  }

  // Route path edges
  for (const seg of pathSegments) {
    ctx.beginPath(); ctx.moveTo(seg.ax, seg.ay); ctx.lineTo(seg.bx, seg.by)
    ctx.strokeStyle = 'rgba(201,168,76,0.7)'
    ctx.lineWidth = 2.5 / s
    ctx.stroke()
    drawArrow(ctx, seg.ax, seg.ay, seg.bx, seg.by, 'rgba(201,168,76,0.7)', 7 / s)
  }

  const stepNum = {}
  if (route) route.order.forEach((id, i) => { stepNum[id] = i + 1 })

  for (const node of nodes) {
    const cx = node.x, cy = node.y
    const isStart = node.id === startId
    const isDest = destIds.includes(node.id)
    const step = stepNum[node.id]
    const active = isStart || isDest
    const isChild = !!node.parent_id
    const r = isChild ? CHILD_R : NODE_R

    if (active) {
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
      ctx.fillStyle = isStart ? 'rgba(74,124,95,0.14)' : 'rgba(201,168,76,0.1)'
      ctx.fill()
    }

    ctx.save()
    ctx.shadowColor = active ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = (active ? 10 : 5) / s
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = isStart ? 'rgba(18,38,24,0.96)'
      : isDest ? 'rgba(36,28,8,0.96)'
      : isChild ? 'rgba(17,12,4,0.55)' : 'rgba(17,12,4,0.65)'
    ctx.fill()
    ctx.strokeStyle = isStart ? '#4a7c5f' : isDest ? '#c9a84c'
      : isChild ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.18)'
    ctx.lineWidth = (active ? 2 : 1) / s
    ctx.stroke()
    ctx.restore()

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = active ? 1 : isChild ? 0.25 : 0.35
    ctx.font = `${r * 0.6}px sans-serif`
    ctx.fillText(node.emoji || '📍', cx, cy - r * 0.18)
    ctx.globalAlpha = 1

    if (active || (!isChild && NODE_R * s >= 14)) {
      const label = node.name.length > 7 ? node.name.slice(0, 6) + '…' : node.name
      ctx.font = `${active ? 'bold ' : ''}${r * 0.43}px sans-serif`
      ctx.fillStyle = isStart ? 'rgba(106,172,143,0.9)' : isDest ? 'rgba(201,168,76,0.88)' : 'rgba(245,237,214,0.22)'
      ctx.fillText(label, cx, cy + r + r * 0.42)
    }

    if (step || isStart) {
      const br = r * 0.45
      const bx2 = cx + r * 0.68, by2 = cy - r * 0.68
      ctx.beginPath(); ctx.arc(bx2, by2, br, 0, Math.PI * 2)
      ctx.fillStyle = isStart ? '#3d7a5c' : '#c9a84c'; ctx.fill()
      ctx.font = `bold ${br * 0.95}px sans-serif`
      ctx.fillStyle = isStart ? '#d4f0e3' : '#110c04'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(isStart ? '출' : String(step), bx2, by2)
    }
  }
}

export default function RouteMapView({ locations, connections, route, startLocationId, destinationLocIds }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [zoomDisplay, setZoomDisplay] = useState(100)
  const [isPanning, setIsPanning] = useState(false)

  const viewRef = useRef({ s: 1, tx: 0, ty: 0 })
  const panRef = useRef(null)
  const fittedRef = useRef(false)
  // Keep latest draw params accessible in stable callbacks
  const drawParamsRef = useRef(null)

  const nodes = useMemo(() => withAutoLayout(locations), [locations])
  const destIds = destinationLocIds ?? []

  drawParamsRef.current = { nodes, connections, route, startLocationId, destIds, dims }

  // ResizeObserver
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

  function redraw() {
    const canvas = canvasRef.current
    const p = drawParamsRef.current
    if (!canvas || !p || !p.dims.w || !p.dims.h) return
    const ctx = canvas.getContext('2d')
    draw(ctx, p.dims.w, p.dims.h, p.nodes, p.connections, p.route, p.startLocationId, p.destIds, viewRef.current)
  }

  function fitView() {
    const p = drawParamsRef.current
    if (!p || !p.dims.w || !p.dims.h) return
    viewRef.current = fitTransform(p.nodes, p.dims.w, p.dims.h)
    setZoomDisplay(Math.round(viewRef.current.s * 100))
    redraw()
  }

  // Fit once after first valid dims
  useEffect(() => {
    if (!dims.w || !dims.h || fittedRef.current) return
    fittedRef.current = true
    viewRef.current = fitTransform(nodes, dims.w, dims.h)
    setZoomDisplay(Math.round(viewRef.current.s * 100))
    redraw()
  }, [dims]) // eslint-disable-line

  // Re-fit when locations change (new data loaded)
  const prevLocationsLen = useRef(0)
  useEffect(() => {
    if (nodes.length && nodes.length !== prevLocationsLen.current) {
      prevLocationsLen.current = nodes.length
      if (dims.w && dims.h) {
        viewRef.current = fitTransform(nodes, dims.w, dims.h)
        setZoomDisplay(Math.round(viewRef.current.s * 100))
      }
    }
    redraw()
  }, [nodes, connections, route, startLocationId, destIds, dims]) // eslint-disable-line

  // Wheel zoom — stable handler via drawParamsRef
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = e => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const v = viewRef.current
      const newS = Math.max(0.05, Math.min(10, v.s * factor))
      const ratio = newS / v.s
      viewRef.current = { s: newS, tx: mx - (mx - v.tx) * ratio, ty: my - (my - v.ty) * ratio }
      setZoomDisplay(Math.round(newS * 100))
      redraw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, []) // stable — uses drawParamsRef + viewRef

  function handleMouseDown(e) {
    if (e.button !== 0) return
    panRef.current = { startX: e.clientX, startY: e.clientY, origTx: viewRef.current.tx, origTy: viewRef.current.ty }
    setIsPanning(true)
  }

  function handleMouseMove(e) {
    if (!panRef.current) return
    const dx = e.clientX - panRef.current.startX
    const dy = e.clientY - panRef.current.startY
    viewRef.current = { ...viewRef.current, tx: panRef.current.origTx + dx, ty: panRef.current.origTy + dy }
    redraw()
  }

  function handleMouseUp() {
    panRef.current = null
    setIsPanning(false)
  }

  function zoomBy(factor) {
    const v = viewRef.current
    const p = drawParamsRef.current
    const cx = (p?.dims.w ?? 400) / 2, cy = (p?.dims.h ?? 300) / 2
    const newS = Math.max(0.05, Math.min(10, v.s * factor))
    const ratio = newS / v.s
    viewRef.current = { s: newS, tx: cx - (cx - v.tx) * ratio, ty: cy - (cy - v.ty) * ratio }
    setZoomDisplay(Math.round(newS * 100))
    redraw()
  }

  const btnStyle = {
    background: 'rgba(17,12,4,0.88)',
    border: '1px solid rgba(201,168,76,0.35)',
    color: 'var(--gold)',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        style={{ display: 'block', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* Zoom toolbar */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => zoomBy(1 / 1.2)} style={{ ...btnStyle, width: 26, height: 26, fontSize: 15 }}>−</button>
        <span style={{ ...btnStyle, padding: '2px 6px', fontSize: 11, minWidth: 38, textAlign: 'center', color: 'var(--gold-dark)' }}>
          {zoomDisplay}%
        </span>
        <button onClick={() => zoomBy(1.2)} style={{ ...btnStyle, width: 26, height: 26, fontSize: 15 }}>+</button>
        <button onClick={fitView} style={{ ...btnStyle, padding: '2px 8px', fontSize: 11 }}>전체</button>
      </div>
    </div>
  )
}
