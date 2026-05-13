import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const PATHS = {
  data: path.join(ROOT, 'data.json'),
  settings: path.join(ROOT, 'content', 'settings', 'site.json'),
  ideas: path.join(ROOT, 'content', 'ideas'),
  quotes: path.join(ROOT, 'content', 'quotes'),
  lunches: path.join(ROOT, 'content', 'lunches')
};

async function main() {
  const previousData = await readJsonIfExists(PATHS.data, {});
  const settings = await readJsonIfExists(PATHS.settings, {});

  const ideas = await readCollection(PATHS.ideas);
  const quotes = await readCollection(PATHS.quotes);
  const lunches = await readCollection(PATHS.lunches);

  const nextData = {
    site: settings.site || previousData.site || {
      weather: '',
      startDate: ''
    },

    ideas: ideas.length ? sortEntries(ideas) : previousData.ideas || [],
    quotes: quotes.length ? sortEntries(quotes) : previousData.quotes || [],
    lunches: lunches.length ? sortEntries(lunches) : previousData.lunches || []
  };

  if (settings.noteConfig || previousData.noteConfig) {
    nextData.noteConfig = settings.noteConfig || previousData.noteConfig;
  }

  if (settings.xPostsConfig || previousData.xPostsConfig) {
    nextData.xPostsConfig = settings.xPostsConfig || previousData.xPostsConfig;
  }

  if (settings.beehiivConfig || previousData.beehiivConfig) {
    nextData.beehiivConfig = settings.beehiivConfig || previousData.beehiivConfig;
  }

  await fs.writeFile(PATHS.data, JSON.stringify(nextData, null, 2) + '\n', 'utf8');

  console.log('data.json generated successfully.');
  console.log(`ideas: ${nextData.ideas.length}`);
  console.log(`quotes: ${nextData.quotes.length}`);
  console.log(`lunches: ${nextData.lunches.length}`);
}

async function readCollection(dir) {
  if (!(await exists(dir))) {
    return [];
  }

  const files = await fs.readdir(dir);

  const jsonFiles = files
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'ja'));

  const entries = [];

  for (const file of jsonFiles) {
    const fullPath = path.join(dir, file);
    const entry = await readJsonIfExists(fullPath, null);

    if (!entry || typeof entry !== 'object') {
      continue;
    }

    entries.push(entry);
  }

  return entries;
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const dateA = getSortDate(a);
    const dateB = getSortDate(b);

    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    return String(b.id || '').localeCompare(String(a.id || ''), 'ja');
  });
}

function getSortDate(entry) {
  return String(
    entry.publishDate ||
    entry.date ||
    entry.updatedAt ||
    entry.modifiedDate ||
    ''
  );
}

async function readJsonIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    console.error(`Failed to read JSON: ${filePath}`);
    throw error;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
