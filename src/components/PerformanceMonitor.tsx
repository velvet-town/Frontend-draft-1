import { useEffect, useRef, useState } from 'react'

// Extend Performance interface for Chrome-specific memory API
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  renderTime: number
  drawCalls: number
  triangles: number
  sprites: number
}

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    drawCalls: 0,
    triangles: 0,
    sprites: 0
  })

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const fpsHistoryRef = useRef<number[]>([])
  const isVisibleRef = useRef(true)

  useEffect(() => {
    let animationFrameId: number

    const updateMetrics = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTimeRef.current
      
      frameCountRef.current++
      
      // Update FPS every second
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime)
        
        // Keep last 10 FPS readings for smoothing
        fpsHistoryRef.current.push(fps)
        if (fpsHistoryRef.current.length > 10) {
          fpsHistoryRef.current.shift()
        }
        
        // Calculate average FPS
        let avgFps = Math.round(
          fpsHistoryRef.current.reduce((sum, val) => sum + val, 0) / fpsHistoryRef.current.length
        )
        
        // Get PIXI renderer stats if available
        const renderer = window.__PIXI_RENDERER__
        let renderTime = 0
        let drawCalls = 0
        let triangles = 0
        let sprites = 0
        
        if (renderer) {
          // Access internal stats if available (these may not be exposed in newer PIXI versions)
          const rendererAny = renderer as any
          if (rendererAny.stats) {
            renderTime = rendererAny.stats.renderTime || 0
            drawCalls = rendererAny.stats.drawCalls || 0
            triangles = rendererAny.stats.triangles || 0
            sprites = rendererAny.stats.sprites || 0
          }
        }
        
        // Get PIXI performance data if available
        const pixiData = window.__PIXI_PERFORMANCE_DATA__
        if (pixiData) {
          sprites = pixiData.sprites || 0
          // Use PIXI's built-in FPS if available
          if (pixiData.frameCount > 0) {
            // Update fps calculation with PIXI data
            const pixiFps = pixiData.frameCount
            fpsHistoryRef.current.push(pixiFps)
            if (fpsHistoryRef.current.length > 10) {
              fpsHistoryRef.current.shift()
            }
            avgFps = Math.round(
              fpsHistoryRef.current.reduce((sum, val) => sum + val, 0) / fpsHistoryRef.current.length
            )
          }
        }
        
        // Get memory usage (only available in Chrome)
        const performanceWithMemory = performance as PerformanceWithMemory
        const memoryUsage = performanceWithMemory.memory ? 
          Math.round(performanceWithMemory.memory.usedJSHeapSize / 1024 / 1024) : 0
        
        setMetrics({
          fps: avgFps,
          frameTime: Math.round(deltaTime / frameCountRef.current),
          memoryUsage,
          renderTime: Math.round(renderTime),
          drawCalls,
          triangles,
          sprites
        })
        
        frameCountRef.current = 0
        lastTimeRef.current = currentTime
      }
      
      animationFrameId = requestAnimationFrame(updateMetrics)
    }

    updateMetrics()

    // Toggle visibility with F12 key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        isVisibleRef.current = !isVisibleRef.current
        setMetrics(prev => ({ ...prev })) // Force re-render
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(animationFrameId)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (!isVisibleRef.current) {
    return null
  }

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 50) return 'text-green-400'
    if (memory < 100) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-sm border border-gray-600 rounded-lg p-3 text-white font-mono text-xs shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 font-semibold">Performance Monitor</span>
        <span className="text-gray-500 text-xs">F12 to toggle</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">FPS:</span>
          <span className={getFpsColor(metrics.fps)}>{metrics.fps}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Frame Time:</span>
          <span className="text-blue-400">{metrics.frameTime}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Memory:</span>
          <span className={getMemoryColor(metrics.memoryUsage)}>{metrics.memoryUsage}MB</span>
        </div>
        
        {metrics.renderTime > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Render:</span>
            <span className="text-purple-400">{metrics.renderTime}ms</span>
          </div>
        )}
        
        {metrics.drawCalls > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Draw Calls:</span>
            <span className="text-cyan-400">{metrics.drawCalls}</span>
          </div>
        )}
        
        {metrics.triangles > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Triangles:</span>
            <span className="text-orange-400">{metrics.triangles.toLocaleString()}</span>
          </div>
        )}
        
        {metrics.sprites > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Sprites:</span>
            <span className="text-pink-400">{metrics.sprites.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceMonitor 