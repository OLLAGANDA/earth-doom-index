export const config = { runtime: 'edge' }

export default function handler() {
  return new Response('og-diagnostic-v1: function reached, edge runtime ok', {
    status: 200,
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
  })
}
