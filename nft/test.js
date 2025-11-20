const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Generate a Blockbuster membership card NFT
 * @param {number} memberNumber - The member number to display
 * @param {boolean} isActive - Whether the membership is active or expired
 * @param {string} memberName - Optional member name
 */
async function generateCard(memberNumber, isActive = true, memberName = 'VALUED MEMBER') {
  const status = isActive ? 'ACTIVE' : 'EXPIRED';
  const statusColor = isActive ? '#4CAF50' : '#f44336';

  // Format member number with leading zeros (e.g., 000042)
  const formattedNumber = String(memberNumber).padStart(6, '0');

  console.log(`Generating card for member #${formattedNumber} (${status})...`);

  try {
    // Create a basic card template (we'll replace this with actual template later)
    // Blockbuster brand colors: Blue #004B87, Yellow #FFC20E
    const width = 800;
    const height = 500;

    // Create SVG for the card
    const svg = `
      <svg width="${width}" height="${height}">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#004B87;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#003366;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad1)" />

        <!-- Yellow accent bar -->
        <rect x="0" y="0" width="${width}" height="60" fill="#FFC20E" />

        <!-- Blockbuster logo text -->
        <text x="40" y="45" font-family="Arial Black, sans-serif" font-size="36" font-weight="bold" fill="#004B87">BLOCKBUSTER</text>

        <!-- Membership card text -->
        <text x="40" y="120" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF">MEMBERSHIP CARD</text>

        <!-- Member name -->
        <text x="40" y="200" font-family="Arial, sans-serif" font-size="20" fill="#FFC20E">MEMBER NAME</text>
        <text x="40" y="235" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF">${memberName}</text>

        <!-- Member number -->
        <text x="40" y="310" font-family="Arial, sans-serif" font-size="20" fill="#FFC20E">MEMBER NUMBER</text>
        <text x="40" y="345" font-family="Courier New, monospace" font-size="32" font-weight="bold" fill="#FFFFFF">${formattedNumber}</text>

        <!-- Status badge -->
        <rect x="550" y="300" width="210" height="60" rx="10" fill="${statusColor}" />
        <text x="655" y="340" font-family="Arial Black, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${status}</text>

        <!-- Footer -->
        <text x="40" y="470" font-family="Arial, sans-serif" font-size="14" fill="#AAAAAA">WOW! WHAT A DIFFERENCE!</text>
      </svg>
    `;

    // Generate the image
    const outputPath = path.join(outputDir, `member-${formattedNumber}-${status.toLowerCase()}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Card generated: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error(`Error generating card:`, error);
    throw error;
  }
}

/**
 * Generate sample cards for testing
 */
async function generateSamples() {
  console.log('Blockbuster NFT Card Generator - Test Run\n');
  console.log('==========================================\n');

  try {
    // Generate a few sample cards
    await generateCard(42, true, 'JOHN DOE');
    await generateCard(1337, true, 'JANE SMITH');
    await generateCard(9999, false, 'EXPIRED USER');
    await generateCard(1, true, 'VIP MEMBER');

    console.log('\n==========================================');
    console.log('All sample cards generated successfully!');
    console.log(`Check the output directory: ${outputDir}`);

  } catch (error) {
    console.error('Failed to generate sample cards:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  generateSamples();
}

// Export for use as a module
module.exports = { generateCard };
