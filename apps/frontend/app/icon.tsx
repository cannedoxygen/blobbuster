import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 26,
          background: '#001a4d',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
      >
        <span
          style={{
            color: '#FFD700',
            fontWeight: 900,
            fontFamily: 'Impact, Arial Black, sans-serif',
            marginTop: -1,
            letterSpacing: '-1px',
          }}
        >
          B
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
