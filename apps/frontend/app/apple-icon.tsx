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
          fontSize: 120,
          background: '#FFD700',
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
            color: '#001a4d',
            fontWeight: 900,
            fontFamily: 'Arial Black, sans-serif',
            marginTop: -8,
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
