import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'data.json');

const REQUIRED_FIELDS = {
  ideas: ['id', 'category', 'title', 'summary', 'tag', 'publishDate', 'readTime', 'body'],
  quotes: ['id', 'quote', 'author', 'publishDate', 'editorNote'],
  lunches: ['id', 'title', 'place', 'publishDate', 'summary', 'body']
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RELATIVE_IMAGE_PATTERN = /^\/images\//;

async function main() {
  const data = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  const errors = [];

  validateSite(data.site, errors);

  for (const collectionName of Object.keys(REQUIRED_FIELDS)) {
    validateCollection(collectionName, data[collectionName], errors);
  }

  if (errors.length) {
    console.error('data.json validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('data.json validation passed.');
}

function validateSite(site, errors) {
  if (!site || typeof site !== 'object') {
    errors.push('site must be an object.');
    return;
  }

  if (site.startDate && !DATE_PATTERN.test(site.startDate)) {
    errors.push(`site.startDate must be YYYY-MM-DD: ${site.startDate}`);
  }
}

function validateCollection(collectionName, entries, errors) {
  if (!Array.isArray(entries)) {
    errors.push(`${collectionName} must be an array.`);
    return;
  }

  const seenIds = new Set();
  const requiredFields = REQUIRED_FIELDS[collectionName];

  entries.forEach((entry, index) => {
    const label = `${collectionName}[${index}]`;

    if (!entry || typeof entry !== 'object') {
      errors.push(`${label} must be an object.`);
      return;
    }

    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        errors.push(`${label}.${field} is required.`);
      }
    }

    if (entry.id) {
      if (seenIds.has(entry.id)) {
        errors.push(`${collectionName} has duplicate id: ${entry.id}`);
      }
      seenIds.add(entry.id);
    }

    if (entry.publishDate && !DATE_PATTERN.test(entry.publishDate)) {
      errors.push(`${label}.publishDate must be YYYY-MM-DD: ${entry.publishDate}`);
    }

    validateImagePath(`${label}.image`, entry.image, errors);
    validateImagePath(`${label}.coverImage`, entry.coverImage, errors);

    if (Array.isArray(entry.photos)) {
      entry.photos.forEach((photo, photoIndex) => {
        validateImagePath(`${label}.photos[${photoIndex}].image`, photo?.image, errors);
      });
    }
  });

  validateDescendingDates(collectionName, entries, errors);
}

function validateImagePath(label, imagePath, errors) {
  if (!imagePath) {
    return;
  }

  if (typeof imagePath !== 'string') {
    errors.push(`${label} must be a string.`);
    return;
  }

  if (!RELATIVE_IMAGE_PATTERN.test(imagePath) && !imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
    errors.push(`${label} should start with /images/, http://, or https://: ${imagePath}`);
  }
}

function validateDescendingDates(collectionName, entries, errors) {
  const datedEntries = entries
    .map((entry, index) => ({ index, id: entry?.id, publishDate: entry?.publishDate }))
    .filter(entry => entry.publishDate);

  for (let i = 1; i < datedEntries.length; i += 1) {
    const previous = datedEntries[i - 1];
    const current = datedEntries[i];

    if (previous.publishDate < current.publishDate) {
      errors.push(
        `${collectionName} should be sorted newest first: ${previous.id || previous.index} (${previous.publishDate}) appears before ${current.id || current.index} (${current.publishDate}).`
      );
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
