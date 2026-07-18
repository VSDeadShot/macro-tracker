import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1c1917',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '128px',
          border: '12px solid #2a2422'
        }}
      >
        <div style={{ color: '#c9704a', fontSize: 320, fontWeight: 'bold', fontFamily: 'sans-serif' }}>
          M
        </div>
      </div>
    ),
    { ...size }
  )
}
