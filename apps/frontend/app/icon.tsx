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
          fontSize: 24,
          background: '#FFD700',
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
            color: '#001a4d',
            fontWeight: 900,
            fontFamily: 'Arial Black, sans-serif',
            marginTop: -2,
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
