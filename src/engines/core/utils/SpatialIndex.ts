export interface SpatialItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  data?: unknown
}

export class SpatialIndex {
  private items = new Map<string, SpatialItem>()
  private cellSize: number
  private grid = new Map<string, Set<string>>()

  constructor(cellSize: number = 64) {
    this.cellSize = cellSize
  }

  insert(item: SpatialItem): void {
    this.items.set(item.id, item)
    const keys = this.getCellKeys(item.x, item.y, item.width, item.height)
    for (const key of keys) {
      let cell = this.grid.get(key)
      if (!cell) {
        cell = new Set()
        this.grid.set(key, cell)
      }
      cell.add(item.id)
    }
  }

  remove(id: string): void {
    const item = this.items.get(id)
    if (!item) return
    const keys = this.getCellKeys(item.x, item.y, item.width, item.height)
    for (const key of keys) {
      const cell = this.grid.get(key)
      if (cell) {
        cell.delete(id)
        if (cell.size === 0) {
          this.grid.delete(key)
        }
      }
    }
    this.items.delete(id)
  }

  update(item: SpatialItem): void {
    this.remove(item.id)
    this.insert(item)
  }

  query(x: number, y: number, width: number, height: number): SpatialItem[] {
    const candidateIds = new Set<string>()
    const keys = this.getCellKeys(x, y, width, height)
    for (const key of keys) {
      const cell = this.grid.get(key)
      if (cell) {
        for (const id of cell) {
          candidateIds.add(id)
        }
      }
    }

    const results: SpatialItem[] = []
    const x2 = x + width
    const y2 = y + height

    for (const id of candidateIds) {
      const item = this.items.get(id)
      if (!item) continue
      const itemX2 = item.x + item.width
      const itemY2 = item.y + item.height
      if (item.x < x2 && itemX2 > x && item.y < y2 && itemY2 > y) {
        results.push(item)
      }
    }

    return results
  }

  findNearest(x: number, y: number, maxDistance: number = Infinity): SpatialItem | null {
    let nearest: SpatialItem | null = null
    let nearestDist = maxDistance

    const searchRadius = maxDistance === Infinity ? this.cellSize * 10 : maxDistance
    const minX = x - searchRadius
    const minY = y - searchRadius
    const maxX = x + searchRadius
    const maxY = y + searchRadius

    const candidateIds = new Set<string>()
    const keys = this.getCellKeys(minX, minY, maxX - minX, maxY - minY)
    for (const key of keys) {
      const cell = this.grid.get(key)
      if (cell) {
        for (const id of cell) {
          candidateIds.add(id)
        }
      }
    }

    for (const id of candidateIds) {
      const item = this.items.get(id)
      if (!item) continue
      const centerX = item.x + item.width / 2
      const centerY = item.y + item.height / 2
      const dx = centerX - x
      const dy = centerY - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = item
      }
    }

    return nearest
  }

  clear(): void {
    this.items.clear()
    this.grid.clear()
  }

  get size(): number {
    return this.items.size
  }

  private getCellKeys(x: number, y: number, w: number, h: number): string[] {
    const startCol = Math.floor(x / this.cellSize)
    const endCol = Math.floor((x + w) / this.cellSize)
    const startRow = Math.floor(y / this.cellSize)
    const endRow = Math.floor((y + h) / this.cellSize)

    const keys: string[] = []
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        keys.push(`${col}:${row}`)
      }
    }
    return keys
  }
}
