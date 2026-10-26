import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const tokenStyles = readFileSync(resolve('src/styles/_tokens.less'), 'utf8');
const tenantIds = readdirSync(resolve('src/tenants'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function colorFrom(css, name) {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))?.[1];
  if (!value) {
    throw new Error(`Could not find a hex value for --${name}.`);
  }
  const normalized = value.slice(1);
  const expanded =
    normalized.length === 3
      ? [...normalized].map((character) => character + character).join('')
      : normalized;
  if (expanded.length !== 6) {
    throw new Error(`Expected --${name} to use a six-digit hex color.`);
  }
  return expanded.match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
}

function luminance(rgb) {
  const [red, green, blue] = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function ratio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const white = [1, 1, 1];
for (const tenantId of tenantIds) {
  const theme = readFileSync(resolve(`src/tenants/${tenantId}/theme.less`), 'utf8');
  if (/--color-bg\s*:/.test(theme)) {
    throw new Error(`${tenantId} must not override the white page background token.`);
  }
  const styles = `${tokenStyles}\n${theme}`;
  for (const name of ['color-text', 'color-primary', 'color-accent']) {
    const score = ratio(colorFrom(styles, name), white);
    if (score < 4.5) {
      throw new Error(`${tenantId} --${name} contrast is ${score.toFixed(2)}:1 (needs 4.5:1).`);
    }
  }
  const focusScore = ratio(colorFrom(styles, 'color-focus'), white);
  if (focusScore < 3) {
    throw new Error(
      `${tenantId} --color-focus contrast is ${focusScore.toFixed(2)}:1 (needs 3:1).`,
    );
  }
}

console.log(`Checked WCAG contrast for ${tenantIds.length} tenant(s).`);
