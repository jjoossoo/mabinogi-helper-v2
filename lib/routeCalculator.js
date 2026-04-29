// WeakMap-based Dijkstra cache: same graph object → reuse results across calls
const _cache = new WeakMap()

function getCachedDijkstra(graph, nodeId) {
  if (!_cache.has(graph)) _cache.set(graph, new Map())
  const byNode = _cache.get(graph)
  if (!byNode.has(nodeId)) byNode.set(nodeId, dijkstra(graph, nodeId))
  return byNode.get(nodeId)
}

export function buildGraph(connections) {
  const graph = {}
  for (const conn of connections) {
    const a = conn.location_a_id
    const b = conn.location_b_id
    const t = conn.travel_time
    if (!graph[a]) graph[a] = {}
    if (!graph[b]) graph[b] = {}
    graph[a][b] = t
    graph[b][a] = t
  }
  return graph
}

function dijkstra(graph, startId) {
  const allIds = Object.keys(graph)
  const dist = Object.fromEntries(allIds.map(id => [id, Infinity]))
  const prev = Object.fromEntries(allIds.map(id => [id, null]))
  const unvisited = new Set(allIds)
  if (dist[startId] !== undefined) dist[startId] = 0

  while (unvisited.size > 0) {
    let u = null
    for (const id of unvisited) {
      if (u === null || dist[id] < dist[u]) u = id
    }
    if (u === null || dist[u] === Infinity) break
    unvisited.delete(u)

    for (const [v, w] of Object.entries(graph[u] ?? {})) {
      const alt = dist[u] + w
      if (alt < (dist[v] ?? Infinity)) {
        dist[v] = alt
        prev[v] = u
      }
    }
  }

  return { dist, prev }
}

function reconstructPath(prev, startId, endId) {
  const path = []
  let cur = endId
  while (cur !== null && cur !== undefined) {
    path.unshift(cur)
    if (cur === startId) break
    cur = prev[cur]
  }
  return path[0] === startId ? path : [startId, endId]
}

// Branch-and-bound brute-force permutation: optimal for ≤ 10 destinations
function bruteForce(startId, destinations, distMap) {
  let bestOrder = null
  let bestTime = Infinity
  const remaining = [...destinations]

  function search(cur, path, timeSoFar) {
    if (path.length === destinations.length) {
      if (timeSoFar < bestTime) {
        bestTime = timeSoFar
        bestOrder = [...path]
      }
      return
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i]
      if (next === null) continue
      const d = distMap[cur]?.[next] ?? Infinity
      const newTime = timeSoFar + d
      if (newTime >= bestTime) continue  // prune
      remaining[i] = null
      path.push(next)
      search(next, path, newTime)
      path.pop()
      remaining[i] = next
    }
  }

  search(startId, [], 0)
  return { bestOrder, bestTime }
}

// Greedy nearest-neighbor for > 10 destinations
function greedy(startId, destinations, distMap) {
  const unvisited = new Set(destinations)
  const order = []
  let current = startId
  let totalTime = 0

  while (unvisited.size > 0) {
    let nearest = null
    let nearestDist = Infinity
    for (const dest of unvisited) {
      const d = distMap[current]?.[dest] ?? Infinity
      if (d < nearestDist) { nearestDist = d; nearest = dest }
    }
    if (nearest === null) break
    order.push(nearest)
    totalTime += nearestDist
    unvisited.delete(nearest)
    current = nearest
  }

  return { bestOrder: order, bestTime: totalTime }
}

export function calculateRoute(graph, startId, destinationIds) {
  if (!destinationIds.length) return { order: [], totalTime: 0, segments: [] }

  // Pre-cache Dijkstra from all relevant nodes
  const relevantNodes = [startId, ...destinationIds]
  const distMap = {}
  const prevMap = {}
  for (const node of relevantNodes) {
    if (!graph[node]) continue
    const { dist, prev } = getCachedDijkstra(graph, node)
    distMap[node] = dist
    prevMap[node] = prev
  }

  const { bestOrder, bestTime } =
    destinationIds.length <= 10
      ? bruteForce(startId, destinationIds, distMap)
      : greedy(startId, destinationIds, distMap)

  if (!bestOrder) return { order: [], totalTime: 0, segments: [] }

  // Reconstruct path segments
  const segments = []
  let current = startId
  let totalTime = 0
  for (const dest of bestOrder) {
    const prev = prevMap[current]
    const path = prev ? reconstructPath(prev, current, dest) : [current, dest]
    const time = distMap[current]?.[dest] ?? Infinity
    const safeTime = time >= 1e9 ? Infinity : time
    segments.push({ from: current, to: dest, path, time: safeTime })
    totalTime += safeTime === Infinity ? 0 : safeTime
    current = dest
  }

  return { order: bestOrder, totalTime, segments }
}
