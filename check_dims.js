
const fs = require('fs');
const path = require('path');
// const sizeOf = require('image-size'); // Removed to avoid dependency

// Since I can't guarantee 'image-size' package is installed, I'll use a basic heuristic or just try to import it.
// If not available, I might have to rely on the user or try a different approach.
// actually, I can't install packages.

// Basic PNG header parsing to get dimensions
function getPngDimensions(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(24);
        fs.readSync(fd, buffer, 0, 24, 0);
        fs.closeSync(fd);

        // Check PNG signature
        if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
            return null; // Not a PNG
        }

        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
    } catch (e) {
        console.error("Error reading " + filePath + ": " + e.message);
        return null;
    }
}

// Hardcoded list of expected IDs/Filenames from collection.ts
const expectedFiles = [
    // Totem & Legendary
    'otter.png', 'snow_leopard.png', 'blue_whale.png', 'narwhal.png', 'komodo_dragon.png', 'axolotl.png', 'orca.png',
    // Epic
    'elephant.png', 'peregrine_falcon.png', 'octopus.png', 'polar_bear.png', 'gorilla.png', 'sloth.png',
    'platypus.png', 'great_white_shark.png', 'rhino.png', 'hippo.png',
    // Rare
    'red_panda.png', 'koala.png', 'chameleon.png', 'king_penguin.png', 'tiger.png',
    'owl.png', 'dolphin.png', 'wolf.png', 'toucan.png', 'cheetah.png', 'kangaroo.png', 'lemur.png', 'fennec.png',
    // Common
    'cat.png', 'dog.png', 'rabbit.png', 'bee.png',
    'frog.png', 'bear.png', 'pig.png', 'cow.png', 'chicken.png', 'hedgehog.png', 'squirrel.png',
    'turtle.png', 'snail.png', 'ant.png', 'ladybug.png', 'butterfly.png', 'crab.png', 'sheep.png', 'horse.png', 'duck.png'
];

let dir = path.join(__dirname, 'public/cards');
if (!fs.existsSync(dir)) {
    // Try root cards folder
    dir = path.join(__dirname, 'cards');
    if (!fs.existsSync(dir)) {
        console.error("Directory not found in public/cards OR cards. Please create one.");
        process.exit(1);
    }
}

console.log("Checking filenames in " + dir);
let report = "Checking content in " + dir + "\n----------------------------------------\n";

const existingFiles = fs.readdirSync(dir);

expectedFiles.forEach(expected => {
    if (existingFiles.includes(expected)) {
        // File exists, check dimensions
        const dims = getPngDimensions(path.join(dir, expected));
        if (dims) {
            const ratio = dims.width / dims.height;
            let status = "✅ OK";
            if (ratio > 0.9 && ratio < 1.1) status = "⚠️ Carré (Square) - Sera rogné";
            else if (ratio > 1.2) status = "❌ Paysage (Landscape) - Sera rogné";
            else if (ratio < 0.6) status = "✅ Portrait (Tall)";
            report += `[FOUND] ${expected}: ${dims.width}x${dims.height} (${status})\n`;
        } else {
            report += `[FOUND] ${expected}: ❌ Invalid PNG or Read Error\n`;
        }
    } else {
        // File missing, check for typos
        const typo = existingFiles.find(f => f.startsWith(expected.substring(0, 3)) && Math.abs(f.length - expected.length) < 3);
        if (typo) {
            report += `[MISSING] ${expected} (Found similar: ${typo} ??)\n`;
        } else {
            report += `[MISSING] ${expected}\n`;
        }
    }
});

// Check for extra files
existingFiles.forEach(f => {
    if (f.endsWith('.png') && !expectedFiles.includes(f)) {
        report += `[EXTRA] ${f} (Not in collection.ts)\n`;
    }
});

fs.writeFileSync(path.join(__dirname, 'report.txt'), report);
console.log("Report written to report.txt");
