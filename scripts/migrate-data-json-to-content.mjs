import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'data.json');
const CONTENT_ROOT = path.join(ROOT, 'content');

const COLLECTIONS = [
  {
    key: 'ideas',
    dir: path.join(CONTENT_ROOT, 'ideas')
  },
  {
    key: 'quotes',
    dir: path.join(CONTENT_ROOT, 'quotes')
  },
  {
    key: 'lunches',
    dir: path.join(CONTENT_ROOT, 'lunches')
  }
];

async function main() {
  const data = await readJson(DATA_PATH);

  await fs.mkdir(path.join(CONTENT_ROOT, 'settings'), { recursive: true });

  const settings = {};

  if (data.site) {
    settings.site = data.site;
  }

  if (data.noteConfig) {
    settings.noteConfig = data.noteConfig;
  }

  if (data.xPostsConfig) {
    settings.xPostsConfig = data.xPostsConfig;
  }

  if (data.beehiivConfig) {
    settings.beehiivConfig = data.beehiivConfig;
  }

  await writeJsonIfMissingOrChanged(
    path.join(CONTENT_ROOT, 'settings', 'site.json'),
    settings
  );

  for (const collection of COLLECTIONS) {
    await fs.mkdir(collection.dir, { recursive: true });

    const items = Array.isArray(data[collection.key]) ? data[collection.key] : [];

    for (const item of items) {
      const id = String(item.id || item.slug || '').trim();

      if (!id) {
        console.warn(`Skipped item without id in ${collection.key}`);
        continue;
      }

      const fileName = `${safeFileName(id)}.json`;
      const filePath = path.join(collection.dir, fileName);

      await writeJsonIfMissingOrChanged(filePath, item);
    }

    console.log(`${collection.key}: ${items.length} items migrated.`);
  }

  console.log('Migration completed.');
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJsonIfMissingOrChanged(filePath, value) {
  const next = JSON.stringify(value, null, 2) + '\n';

  try {
    const current = await fs.readFile(filePath, 'utf8');

    if (current === next) {
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, next, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, filePath)}`);
}

function safeFileName(value) {
  return String(value)
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
