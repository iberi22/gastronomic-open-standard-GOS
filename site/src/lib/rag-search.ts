import Dexie, { type Table } from 'dexie';
import { pipeline } from '@xenova/transformers';

export interface EmbeddedItem {
  id: string;
  slug: string;
  title: string;
  type: 'recipe' | 'ingredient';
  category: string;
  excerpt: string;
  embedding: number[];
}

export interface RecipeResult {
  id: string;
  slug: string;
  title: string;
  type: 'recipe' | 'ingredient';
  category: string;
  excerpt: string;
  score: number;
}

class RagDatabase extends Dexie {
  embeddings!: Table<EmbeddedItem>;

  constructor() {
    super('RagDatabase');
    this.version(1).stores({
      embeddings: 'id, slug, title, type, category'
    });
  }
}

const db = new RagDatabase();
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    // Disable local model loading check if it fails in the browser
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(query, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ensureEmbeddingsLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const count = await db.embeddings.count();
    if (count === 0) {
      console.log('IndexedDB is empty. Loading embeddings from embeddings.json...');
      const baseUrl = import.meta.env.BASE_URL || '';
      const url = `${baseUrl}/data/embeddings.json`.replace(/\/+/g, '/');
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch embeddings from ${url}: ${res.statusText}`);
      }
      const items: EmbeddedItem[] = await res.json();
      console.log(`Loaded ${items.length} items. Storing in IndexedDB...`);
      await db.embeddings.bulkAdd(items);
      console.log('IndexedDB population complete.');
    }
  } catch (error) {
    console.error('Failed to load/populate embeddings in IndexedDB:', error);
  }
}

async function getServerEmbeddings(): Promise<EmbeddedItem[]> {
  // Use dynamic imports to prevent filesystem operations from bundling in client bundle
  const fs = await import('fs');
  const path = await import('path');

  const pathsToTry = [
    path.resolve(process.cwd(), 'public/data/embeddings.json'),
    path.resolve(process.cwd(), 'site/public/data/embeddings.json')
  ];

  for (const filePath of pathsToTry) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  throw new Error('embeddings.json not found on the server');
}

export async function ragSearch(query: string, topK: number = 10): Promise<RecipeResult[]> {
  if (!query || !query.trim()) return [];

  try {
    // 1. Generate embedding for query
    const queryVec = await getQueryEmbedding(query);

    // 2. Fetch all stored embeddings
    let items: EmbeddedItem[] = [];
    if (typeof window === 'undefined') {
      items = await getServerEmbeddings();
    } else {
      await ensureEmbeddingsLoaded();
      items = await db.embeddings.toArray();
    }

    // 3. Compute cosine similarity
    const scored = items.map(item => {
      const similarity = cosineSimilarity(queryVec, item.embedding);
      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        type: item.type,
        category: item.category,
        excerpt: item.excerpt,
        score: similarity
      };
    });

    // 4. Sort and return topK
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  } catch (error) {
    console.error('Error performing RAG search:', error);
    return [];
  }
}
