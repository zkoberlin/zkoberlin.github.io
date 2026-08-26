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

const versionSource = await readFile('assets/js/version.js', 'utf8');
const currentVersion = versionSource.match(/const version = '(\d+\.\d+\.\d+)';/)?.[1];
if (!currentVersion) {
  console.error('Aktuelle Version konnte nicht ermittelt werden.');
  process.exit(1);
}

for (const file of files) {
  const current = await readFile(file, 'utf8');
  const updated = current.replaceAll(currentVersion, nextVersion);
  await writeFile(file, updated);
}

console.log(`Paul Hub Release v${nextVersion} vorbereitet.`);
