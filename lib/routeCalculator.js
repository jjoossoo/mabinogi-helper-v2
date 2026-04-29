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

// Greedy nearest-neighbor TSP using Dijkstra for pairwise distances
export function calculateRoute(graph, startId, destinationIds) {
  if (!destinationIds.length) return { order: [], totalTime: 0, segments: [] }

  const relevantNodes = [startId, ...destinationIds]
  const distMap = {}
  const prevMap = {}
  for (const node of relevantNodes) {
    if (!graph[node]) continue
    const { dist, prev } = dijkstra(graph, node)
    distMap[node] = dist
    prevMap[node] = prev
  }

  const unvisited = new Set(destinationIds)
  const order = []
  const segments = []
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

    const path = prevMap[current] ? reconstructPath(prevMap[current], current, nearest) : [current, nearest]
    segments.push({ from: current, to: nearest, path, time: nearestDist })
    order.push(nearest)
    totalTime += nearestDist === Infinity ? 0 : nearestDist
    unvisited.delete(nearest)
    current = nearest
  }

  return { order, totalTime, segments }
}
