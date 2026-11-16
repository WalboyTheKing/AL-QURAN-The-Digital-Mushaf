import type {
  ChapterAudioData,
  ReciterInfo,
  VerseTimestamp,
  WordSegment,
} from '../types/audio';

const QURAN_API_BASE = 'https://api.quran.com/api/v4';
const ISLAMIC_NETWORK_AUDIO_CDN = 'https://cdn.islamic.network/quran/audio/128';

interface QuranComRecitation {
  id: number;
  reciter_name: string;
  style: string | null;
}

interface RawChapterAudioResponse {
  audio_file?: {
    audio_url: string;
    timestamps?: Array<{
      verse_key: string;
      timestamp_from: number;
      timestamp_to: number;
      duration: number;
      segments?: number[][];
    }>;
  };
}

export interface ChapterVerseMeta {
  id: number;
  verse_key: string;
  verse_number: number;
  page_number: number;
}

let recitersCache: ReciterInfo[] | null = null;
const chapterAudioCache = new Map<string, ChapterAudioData>();
const chapterVerseMetaCache = new Map<number, ChapterVerseMeta[]>();

const RECITER_FRENCH_NAMES: Record<string, string> = {
  'Mishari Rashid al-`Afasy': 'Mishary Rashid Al-Afasy',
  'Abdur-Rahman as-Sudais': 'Abdul Rahman Al-Sudais',
  'AbdulBaset AbdulSamad': 'Abdul Basit Abdus Samad',
  'Mohamed Siddiq al-Minshawi': 'Muhammad Siddiq Al-Minshawi',
  'Mahmoud Khalil Al-Husary': 'Mahmoud Khalil Al-Husary',
  'Hani ar-Rifai': 'Hani Ar-Rifai',
  'Abu Bakr al-Shatri': 'Abu Bakr Al-Shatri',
  'Sa`ud ash-Shuraym': 'Saoud Al-Shuraim',
  'Mohamed al-Tablawi': 'Muhammad Al-Tablawi',
};

const WORD_SEGMENT_CAPABLE_QDC_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);

export async function getAvailableReciters(): Promise<ReciterInfo[]> {
  if (recitersCache) return recitersCache;

  const response = await fetch(`${QURAN_API_BASE}/resources/recitations`);
  if (!response.ok) {
    throw new Error('Impossible de charger la liste des récitateurs.');
  }

  const data = (await response.json()) as { recitations: QuranComRecitation[] };

  const qdcReciters: ReciterInfo[] = data.recitations.map((rec) => {
    const displayName = RECITER_FRENCH_NAMES[rec.reciter_name] ?? rec.reciter_name;
    const hasWordSync = WORD_SEGMENT_CAPABLE_QDC_IDS.has(rec.id);
    return {
      id: `qdc:${rec.id}`,
      numericId: rec.id,
      provider: 'qurancom',
      name: displayName,
      style: rec.style,
      syncPrecision: hasWordSync ? 'word' : 'verse',
      available: true,
    };
  });

  // Sort preferred popular reciters first
  const preferredOrder = [7, 2, 1, 3, 9, 8, 6, 12, 5, 4, 10, 11];
  qdcReciters.sort((a, b) => {
    const idxA = preferredOrder.indexOf(a.numericId ?? 999);
    const idxB = preferredOrder.indexOf(b.numericId ?? 999);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  // Add verified Islamic Network per-ayah reciter Maher Al-Muaiqly (verse-level sync)
  const extraReciters: ReciterInfo[] = [
    {
      id: 'in:ar.mahermuaiqly',
      editionIdentifier: 'ar.mahermuaiqly',
      provider: 'islamicnetwork',
      name: 'Maher Al-Muaiqly',
      style: 'Murattal',
      syncPrecision: 'verse',
      available: true,
    },
  ];

  recitersCache = [...qdcReciters.slice(0, 4), ...extraReciters, ...qdcReciters.slice(4)];
  return recitersCache;
}

export async function getChapterVerseMeta(chapterId: number): Promise<ChapterVerseMeta[]> {
  const cached = chapterVerseMetaCache.get(chapterId);
  if (cached) return cached;

  const all: ChapterVerseMeta[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const res = await fetch(
      `${QURAN_API_BASE}/verses/by_chapter/${chapterId}?per_page=300&page=${page}&fields=verse_key,verse_number,page_number`,
    );
    if (!res.ok) {
      throw new Error(`Erreur chargement métadonnées sourate ${chapterId}`);
    }
    const json = (await res.json()) as {
      verses: ChapterVerseMeta[];
      pagination?: { next_page: number | null };
    };
    all.push(...json.verses);
    if (json.pagination?.next_page) {
      page = json.pagination.next_page;
    } else {
      hasNext = false;
    }
  }

  chapterVerseMetaCache.set(chapterId, all);
  return all;
}

export async function getChapterAudio(
  reciter: ReciterInfo,
  chapterId: number,
): Promise<ChapterAudioData> {
  const cacheKey = `${reciter.id}:${chapterId}`;
  const cached = chapterAudioCache.get(cacheKey);
  if (cached) return cached;

  if (reciter.provider === 'qurancom' && reciter.numericId) {
    const res = await fetch(
      `${QURAN_API_BASE}/chapter_recitations/${reciter.numericId}/${chapterId}?segments=true`,
    );
    if (!res.ok) {
      throw new Error(`Audio indisponible pour ${reciter.name} (Sourate ${chapterId}).`);
    }
    const json = (await res.json()) as RawChapterAudioResponse;
    const af = json.audio_file;
    if (!af?.audio_url) {
      throw new Error(`Fichier audio introuvable pour ${reciter.name}.`);
    }

    let hasWordSegments = false;
    const timestamps: VerseTimestamp[] = (af.timestamps ?? []).map((t) => {
      const cleanSegments: WordSegment[] = [];
      if (Array.isArray(t.segments)) {
        for (const seg of t.segments) {
          if (
            Array.isArray(seg) &&
            seg.length >= 3 &&
            typeof seg[0] === 'number' &&
            typeof seg[1] === 'number' &&
            typeof seg[2] === 'number'
          ) {
            cleanSegments.push([seg[0], seg[1], seg[2]]);
          }
        }
      }
      if (cleanSegments.length > 0) hasWordSegments = true;
      return {
        verse_key: t.verse_key,
        timestamp_from: t.timestamp_from,
        timestamp_to: t.timestamp_to,
        duration: t.duration,
        segments: cleanSegments,
      };
    });

    const result: ChapterAudioData = {
      reciterId: reciter.id,
      chapterId,
      audioUrl: af.audio_url,
      timestamps,
      hasWordSegments,
    };
    chapterAudioCache.set(cacheKey, result);
    return result;
  }

  // Per-ayah provider (Islamic Network CDN)
  const meta = await getChapterVerseMeta(chapterId);
  const result: ChapterAudioData = {
    reciterId: reciter.id,
    chapterId,
    audioUrl: `${ISLAMIC_NETWORK_AUDIO_CDN}/${reciter.editionIdentifier}/${meta[0]?.id ?? 1}.mp3`,
    timestamps: [],
    hasWordSegments: false,
  };
  chapterAudioCache.set(cacheKey, result);
  return result;
}

export function getPerVerseAudioUrl(editionIdentifier: string, globalVerseId: number): string {
  return `${ISLAMIC_NETWORK_AUDIO_CDN}/${editionIdentifier}/${globalVerseId}.mp3`;
}
