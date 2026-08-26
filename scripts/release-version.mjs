import { readFile, writeFile } from 'node:fs/promises';

const nextVersion = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test(nextVersion || '')) {
  console.error('Verwendung: node scripts/release-version.mjs <MAJOR.MINOR.PATCH>');
  process.exit(1);
}

const files = [
  'assets/js/version.js',
  'index.html',
  'kalenderpaul/index.html',
  'finanzenpaul/index.html',
];

for (const file of files) {
  const current = await readFile(file, 'utf8');
  const updated = current
    .replace(/const version = '\d+\.\d+\.\d+';/, `const version = '${nextVersion}';`)
    .replaceAll(/\?v=\d+\.\d+\.\d+/g, `?v=${nextVersion}`);
  await writeFile(file, updated);
}

console.log(`Paul Hub Release v${nextVersion} vorbereitet.`);
