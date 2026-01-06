import { useEffect, useState } from 'react'

export const useLogs = () => {
  const [Data, setData] = useState<any[]>([])

  useEffect(() => {
    const sse = new EventSource('/api/logs')
    sse.addEventListener('log', (event) => {
      const logData = JSON.parse(event.data)
      const op = logData.op ?? 'Add' // if no op, assume 'Add'

      setData((prev) => {
        if (op === 'Add') {
          if (
            prev.some(
              (old) =>
                (old.id && old.id === logData.id) ||
                (old.timestamp === logData.timestamp &&
                  old.method === logData.method &&
                  old.path === logData.path),
            )
          ) {
            return prev
          }
          return [...prev, logData]
        }
        if (op === 'Delete') {
          // Expect logData to have an identifier to match
          // Could be id, or timestamp+method+path as before
          return prev.filter(
            (old) =>
              !(
                (old.id && logData.id && old.id === logData.id) ||
                (old.timestamp === logData.timestamp &&
                  old.method === logData.method &&
                  old.path === logData.path)
              ),
          )
        }
        return prev
      })
    })

    return () => {
      sse.close()
    }
  }, [])

  return Data
}
