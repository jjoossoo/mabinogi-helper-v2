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

// Scale+translate so all nodes fit the canvas with padding
function computeTransform(nodes, w, h, pad = 52) {
  if (!nodes.length || w === 0 || h === 0) return { s: 1, tx: 0, ty: 0 }
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const bw = (maxX - minX) || 200
  const bh = (maxY - minY) || 200
  const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 3)
  return { s, tx: (w - bw * s) / 2 - minX * s, ty: (h - bh * s) / 2 - minY * s }
}

function px(x, y, t) {
  return [x * t.s + t.tx, y * t.s + t.ty]
}

function drawArrow(ctx, ax, ay, bx, by, color, size = 7) {
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

function draw(ctx, w, h, nodes, connections, route, startId, destIds) {
  ctx.clearRect(0, 0, w, h)

  // Background
  ctx.fillStyle = '#0d0905'
  ctx.fillRect(0, 0, w, h)

  // Grid dots
  ctx.fillStyle = 'rgba(201,168,76,0.05)'
  for (let x = 0; x < w; x += 44) {
    for (let y = 0; y < h; y += 44) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
    }
  }

  if (!nodes.length) return

  const t = computeTransform(nodes, w, h)
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
  const nodeR = Math.max(13, Math.min(24, 24 * t.s))
  const childR = Math.max(9, Math.min(17, 17 * t.s))

  // Group bubbles for sub-locations
  const groups = {}
  for (const n of nodes) {
    if (n.parent_id) {
      if (!groups[n.parent_id]) groups[n.parent_id] = []
      groups[n.parent_id].push(n)
    }
  }
  for (const [parentId, children] of Object.entries(groups)) {
    if (!children.length) continue
    const pad = childR + 14
    const cxs = children.map(n => { const [cx] = px(n.x, n.y, t); return cx })
    const cys = children.map(n => { const [, cy] = px(n.x, n.y, t); return cy })
    const x0 = Math.min(...cxs) - pad, x1 = Math.max(...cxs) + pad
    const y0 = Math.min(...cys) - pad, y1 = Math.max(...cys) + pad
    ctx.beginPath()
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 16)
    ctx.fillStyle = 'rgba(201,168,76,0.05)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.setLineDash([])
    const parent = nm[parentId]
    if (parent) {
      const fontSize = Math.max(9, Math.min(12, 11 * t.s))
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = 'rgba(201,168,76,0.4)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${parent.emoji} ${parent.name}`, x0 + 7, y0 + 5)
    }
  }

  // Build set of edges that belong to the route path
  const routeEdgeKey = new Set()
  const pathSegments = [] // [{ax,ay,bx,by}] to draw arrows
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
    const isRoute = routeEdgeKey.has(`${conn.location_a_id}|${conn.location_b_id}`)
    if (isRoute) continue
    const [ax, ay] = px(a.x, a.y, t), [bx, by] = px(b.x, b.y, t)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.strokeStyle = 'rgba(201,168,76,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([])
  }

  // Route path edges (on top)
  for (const seg of pathSegments) {
    const [ax, ay] = px(seg.ax, seg.ay, t), [bx, by] = px(seg.bx, seg.by, t)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.strokeStyle = 'rgba(201,168,76,0.7)'
    ctx.lineWidth = 2.5
    ctx.stroke()
    drawArrow(ctx, ax, ay, bx, by, 'rgba(201,168,76,0.7)')
  }

  // Destination step numbers from route.order
  const stepNum = {}
  if (route) route.order.forEach((id, i) => { stepNum[id] = i + 1 })

  // Nodes
  for (const node of nodes) {
    const [cx, cy] = px(node.x, node.y, t)
    const isStart = node.id === startId
    const isDest = destIds.includes(node.id)
    const step = stepNum[node.id]
    const active = isStart || isDest
    const isChild = !!node.parent_id
    const r = isChild ? childR : nodeR

    // Outer glow ring for active nodes
    if (active) {
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
      ctx.fillStyle = isStart ? 'rgba(74,124,95,0.14)' : 'rgba(201,168,76,0.1)'
      ctx.fill()
    }

    // Circle
    ctx.save()
    ctx.shadowColor = active ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = active ? 10 : 5
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = isStart ? 'rgba(18,38,24,0.96)'
      : isDest ? 'rgba(36,28,8,0.96)'
      : isChild ? 'rgba(17,12,4,0.55)' : 'rgba(17,12,4,0.65)'
    ctx.fill()
    ctx.strokeStyle = isStart ? '#4a7c5f' : isDest ? '#c9a84c' : isChild ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.18)'
    ctx.lineWidth = active ? 2 : 1
    ctx.stroke()
    ctx.restore()

    // Emoji
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = active ? 1 : isChild ? 0.25 : 0.35
    ctx.font = `${Math.max(8, r * 0.6)}px sans-serif`
    ctx.fillText(node.emoji || '📍', cx, cy - r * 0.18)
    ctx.globalAlpha = 1

    // Name tag
    if (active || (!isChild && r >= 18)) {
      const label = node.name.length > 7 ? node.name.slice(0, 6) + '…' : node.name
      ctx.font = `${active ? 'bold ' : ''}${Math.max(8, r * 0.43)}px sans-serif`
      ctx.fillStyle = isStart ? 'rgba(106,172,143,0.9)' : isDest ? 'rgba(201,168,76,0.88)' : 'rgba(245,237,214,0.22)'
      ctx.fillText(label, cx, cy + r + Math.max(7, r * 0.42))
    }

    // Badge (step number or 출발)
    if (step || isStart) {
      const br = Math.max(8, r * 0.45)
      const bx2 = cx + r * 0.68, by2 = cy - r * 0.68
      ctx.beginPath(); ctx.arc(bx2, by2, br, 0, Math.PI * 2)
      ctx.fillStyle = isStart ? '#3d7a5c' : '#c9a84c'; ctx.fill()
      ctx.font = `bold ${Math.max(7, br * 0.95)}px sans-serif`
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

  const nodes = useMemo(() => withAutoLayout(locations), [locations])

  // Responsive canvas: observe container size
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !dims.w || !dims.h) return
    draw(canvas.getContext('2d'), dims.w, dims.h, nodes, connections, route, startLocationId, destinationLocIds ?? [])
  }, [nodes, connections, route, startLocationId, destinationLocIds, dims])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} width={dims.w} height={dims.h} style={{ display: 'block' }} />
    </div>
  )
}
