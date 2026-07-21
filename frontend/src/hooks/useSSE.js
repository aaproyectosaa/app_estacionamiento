import { useEffect, useRef, useState } from 'react'
import { useParkingStore } from '../stores/parkingStore'

export function useSSE() {
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef(null)
  const updatePlaza = useParkingStore(state => state.updatePlaza)

  useEffect(() => {
    const es = new EventSource('/api/live')
    eventSourceRef.current = es
    setConnected(true)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'plaza_update') {
          updatePlaza(data.plazaId, data.ocupado, data.pago)
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [updatePlaza])

  return { connected }
}
