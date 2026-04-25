import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const REACT_ELEMENT = Symbol.for('react.element')

function el(type, props, children) {
  return {
    $$typeof: REACT_ELEMENT,
    type,
    key: null,
    ref: null,
    props: { ...(props || {}), children },
  }
}

export default function handler() {
  const tree = el('div', {
    style: {
      display: 'flex',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#212529',
      color: '#ffffff',
      fontSize: '72px',
    },
  }, 'HELLO OG MIN')

  return new ImageResponse(tree, { width: 600, height: 400 })
}
