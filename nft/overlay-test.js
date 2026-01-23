const sharp = require('sharp');
const path = require('path');

async function testNameOverlay() {
  const templatePath = path.join(__dirname, 'card.png');
  const outputPath = path.join(__dirname, 'output', 'test-name.png');

  // Test data
  const memberNumber = '000042';
  const walletAddress = '0xbeef1f109b13a5cfe22ee360fd10525';
  const status = 'ACTIVE'; // or 'EXPIRED'
  const isActive = status === 'ACTIVE';

  // Positions for each field
  const numberX = 420;
  const numberY = 635;

  const nameX = 420;
  const nameY = 710;

  const statusX = 255;  // moved left 10px (was 265)
  const statusY = 775;  // raised by 5px more (was 780)

  const fontSize = 20;  // bigger font (was 18)

  // Green for ACTIVE, Red for EXPIRED
  const statusColor = isActive ? '#00FF00' : '#FF0000';

  const textSvg = `
    <svg width="1024" height="1024">
      <text
        x="${numberX}"
        y="${numberY}"
        font-family="Courier New, monospace"
        font-size="${fontSize}"
        font-weight="bold"
        fill="#000000">${memberNumber}</text>
      <text
        x="${nameX}"
        y="${nameY}"
        font-family="Courier New, monospace"
        font-size="${fontSize}"
        font-weight="bold"
        fill="#000000">${walletAddress}</text>
      <text
        x="${statusX}"
        y="${statusY}"
        font-family="Courier New, monospace"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${statusColor}">${status}</text>
    </svg>
  `;

  await sharp(templatePath)
    .composite([{
      input: Buffer.from(textSvg),
      top: 0,
      left: 0
    }])
    .toFile(outputPath);

  console.log(`✓ Test card saved to: ${outputPath}`);
  console.log(`Member Number: X=${numberX}, Y=${numberY}`);
  console.log(`Member Name: X=${nameX}, Y=${nameY}`);
  console.log(`Status: X=${statusX}, Y=${statusY}`);
}

testNameOverlay().catch(console.error);
