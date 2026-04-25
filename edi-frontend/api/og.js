import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const REACT_ELEMENT = Symbol.for('react.element')

function el(type, props, ...children) {
  return {
    $$typeof: REACT_ELEMENT,
    type,
    key: null,
    ref: null,
    props: { ...(props || {}), children: children.length === 1 ? children[0] : children },
  }
}

export default function handler() {
  const tree = el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#212529',
      color: '#ffffff',
      fontSize: '40px',
    },
  },
    el('div', { style: { display: 'flex' } }, 'TWO CHILD TEST'),
    el('div', { style: { display: 'flex' } }, 'SECOND ROW')
  )

  return new ImageResponse(tree, { width: 600, height: 400 })
}
