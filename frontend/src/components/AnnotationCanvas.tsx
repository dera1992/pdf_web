import { useEffect, useRef } from 'react'
import { Canvas, Rect } from 'fabric'
import { useAnnotationStore } from '../store/annotationStore'

export const AnnotationCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeTool = useAnnotationStore((state) => state.activeTool)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true
    })

    canvas.on('mouse:down', (event) => {
      if (activeTool === 'note') {
        const pointer = canvas.getPointer(event.e)
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 120,
          height: 80,
          fill: '#fff1f2',
          stroke: '#f43f5e'
        })
        canvas.add(rect)
      }
    })

    return () => {
      canvas.dispose()
    }
  }, [activeTool])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
