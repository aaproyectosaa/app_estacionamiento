const clients = new Set()

export function sseMiddleware(req, res, _next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const clientId = Date.now()
  clients.add(res)

  res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId })}\n\n`)

  req.on('close', () => {
    clients.delete(res)
  })
}

export function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  clients.forEach(client => {
    client.write(data)
  })
}

export function broadcastPlazaUpdate(plazaId, ocupado, pago, zona) {
  broadcast({
    type: 'plaza_update',
    plazaId,
    ocupado,
    pago,
    zona,
    timestamp: new Date().toISOString(),
  })
}
