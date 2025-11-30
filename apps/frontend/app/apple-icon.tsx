import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          background: '#001a4d',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: '#FFD700',
            fontWeight: 900,
            fontFamily: 'Impact, Arial Black, sans-serif',
            marginTop: -5,
            letterSpacing: '-3px',
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
