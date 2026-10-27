import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';

// Import raw data from migration folder
import domainsData from '../data/migration/scientific_domains.json';
import discFr from '../data/migration/discoveries.json';
import discAr from '../data/migration/discoveries_arabic.json';
import discEn from '../data/migration/discoveries_english.json';
import discEs from '../data/migration/discoveries_spanish.json';

import detailFr from '../data/migration/discovery_details.json';
import detailAr from '../data/migration/discovery_details_arabic.json';
import detailEn from '../data/migration/discovery_details_english.json';
import detailEs from '../data/migration/discovery_details_spanish.json';

import videoFr from '../data/migration/video_feed.json';
import videoAr from '../data/migration/video_feed_arabic.json';
import videoEn from '../data/migration/video_feed_english.json';
import videoEs from '../data/migration/video_feed_spanish.json';

import featFr from '../data/migration/featured_content_french.json';
import featAr from '../data/migration/featured_content_arabic.json';
import featEn from '../data/migration/featured_content_english.json';
import featEs from '../data/migration/featured_content_spanish.json';

import knowledgeData from '../data/migration/knowledge.json';

export async function runInitialMigration(onProgress) {
  const log = (msg) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  log('Démarrage de la migration vers Firebase Firestore...');

  // 1. Domaines Scientifiques
  log('1/6 : Migration des domaines scientifiques...');
  const domainsList = domainsData.domains || [];
  for (const domain of domainsList) {
    await setDoc(doc(db, 'scientific_domains', String(domain.id)), domain);
  }
  log(`${domainsList.length} domaines migrés avec succès.`);

  // 2. Découvertes (Fusion multilingue par ID)
  log('2/6 : Fusion et migration des découvertes multilingues...');
  const frMap = new Map((discFr.discoveries || []).map(d => [d.id, d]));
  const arMap = new Map((discAr.discoveries || []).map(d => [d.id, d]));
  const enMap = new Map((discEn.discoveries || []).map(d => [d.id, d]));
  const esMap = new Map((discEs.discoveries || []).map(d => [d.id, d]));

  const allDiscIds = Array.from(new Set([
    ...frMap.keys(),
    ...arMap.keys(),
    ...enMap.keys(),
    ...esMap.keys()
  ])).sort((a, b) => a - b);

  log(`Total de ${allDiscIds.length} découvertes uniques trouvées.`);

  let batch = writeBatch(db);
  let batchCount = 0;

  for (let i = 0; i < allDiscIds.length; i++) {
    const id = allDiscIds[i];
    const frItem = frMap.get(id) || {};
    const arItem = arMap.get(id) || {};
    const enItem = enMap.get(id) || {};
    const esItem = esMap.get(id) || {};

    const base = frItem.id ? frItem : (enItem.id ? enItem : (arItem.id ? arItem : esItem));

    const masterDoc = {
      id: Number(id),
      imageUrl: base.imageUrl || '',
      surah: base.surah || '',
      verse: base.verse || '',
      arabicText: base.arabicText || '',
      timestamp: base.timestamp || new Date().toISOString(),
      translations: {
        fr: {
          title: frItem.title || '',
          description: frItem.description || '',
          domain: frItem.domain || '',
          surah: frItem.surah || ''
        },
        ar: {
          title: arItem.title || '',
          description: arItem.description || '',
          domain: arItem.domain || '',
          surah: arItem.surah || ''
        },
        en: {
          title: enItem.title || '',
          description: enItem.description || '',
          domain: enItem.domain || '',
          surah: enItem.surah || ''
        },
        es: {
          title: esItem.title || '',
          description: esItem.description || '',
          domain: esItem.domain || '',
          surah: esItem.surah || ''
        }
      }
    };

    batch.set(doc(db, 'discoveries', String(id)), masterDoc);
    batchCount++;

    if (batchCount >= 40 || i === allDiscIds.length - 1) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
      log(`Progression découvertes : ${i + 1}/${allDiscIds.length}`);
    }
  }

  // 3. Fiches Détaillées (discovery_details)
  log('3/6 : Fusion et migration des fiches détaillées approfondies...');
  const detFrMap = new Map((detailFr.details || []).map(d => [d.id, d]));
  const detArMap = new Map((detailAr.details || []).map(d => [d.id, d]));
  const detEnMap = new Map((detailEn.details || []).map(d => [d.id, d]));
  const detEsMap = new Map((detailEs.details || []).map(d => [d.id, d]));

  const allDetailIds = Array.from(new Set([
    ...detFrMap.keys(),
    ...detArMap.keys(),
    ...detEnMap.keys(),
    ...detEsMap.keys()
  ])).sort((a, b) => a - b);

  log(`Total de ${allDetailIds.length} fiches détaillées trouvées.`);

  let detBatch = writeBatch(db);
  let detBatchCount = 0;

  for (let i = 0; i < allDetailIds.length; i++) {
    const id = allDetailIds[i];
    const fr = detFrMap.get(id) || {};
    const ar = detArMap.get(id) || {};
    const en = detEnMap.get(id) || {};
    const es = detEsMap.get(id) || {};

    const base = fr.id ? fr : (en.id ? en : (ar.id ? ar : es));

    const detailDoc = {
      id: Number(id),
      category: base.category || '',
      heroImage: base.heroImage || '',
      thumbnail: base.thumbnail || '',
      videoUrl: base.videoUrl || '',
      videoDuration: base.videoDuration || '',
      videoThumbnail: base.videoThumbnail || '',
      arabicVerse: base.arabicVerse || '',
      diagrams: base.diagrams || [],
      timeline: base.timeline || [],
      translations: {
        fr: {
          title: fr.title || '',
          surahReference: fr.surahReference || '',
          readTime: fr.readTime || '',
          scientificExplanation: fr.scientificExplanation || '',
          verseTranslation: fr.verseTranslation || '',
          verseCommentary: fr.verseCommentary || '',
          historicalContext: fr.historicalContext || '',
          videoTitle: fr.videoTitle || ''
        },
        ar: {
          title: ar.title || '',
          surahReference: ar.surahReference || '',
          readTime: ar.readTime || '',
          scientificExplanation: ar.scientificExplanation || '',
          verseTranslation: ar.verseTranslation || '',
          verseCommentary: ar.verseCommentary || '',
          historicalContext: ar.historicalContext || '',
          videoTitle: ar.videoTitle || ''
        },
        en: {
          title: en.title || '',
          surahReference: en.surahReference || '',
          readTime: en.readTime || '',
          scientificExplanation: en.scientificExplanation || '',
          verseTranslation: en.verseTranslation || '',
          verseCommentary: en.verseCommentary || '',
          historicalContext: en.historicalContext || '',
          videoTitle: en.videoTitle || ''
        },
        es: {
          title: es.title || '',
          surahReference: es.surahReference || '',
          readTime: es.readTime || '',
          scientificExplanation: es.scientificExplanation || '',
          verseTranslation: es.verseTranslation || '',
          verseCommentary: es.verseCommentary || '',
          historicalContext: es.historicalContext || '',
          videoTitle: es.videoTitle || ''
        }
      }
    };

    detBatch.set(doc(db, 'discovery_details', String(id)), detailDoc);
    detBatchCount++;

    if (detBatchCount >= 30 || i === allDetailIds.length - 1) {
      await detBatch.commit();
      detBatch = writeBatch(db);
      detBatchCount = 0;
      log(`Progression fiches détaillées : ${i + 1}/${allDetailIds.length}`);
    }
  }

  // 4. Vidéos & Reels
  log('4/6 : Migration des vidéos et reels...');
  const vFr = Array.isArray(videoFr) ? videoFr : [];
  const vAr = Array.isArray(videoAr) ? videoAr : [];
  const vEn = Array.isArray(videoEn) ? videoEn : [];
  const vEs = Array.isArray(videoEs) ? videoEs : [];

  for (let i = 0; i < vFr.length; i++) {
    const vf = vFr[i];
    const va = vAr[i] || {};
    const ve = vEn[i] || {};
    const vs = vEs[i] || {};

    const videoDoc = {
      id: vf.id || `reel_${i + 1}`,
      videoUrl: vf.videoUrl || '',
      videoDuration: vf.videoDuration || '',
      videoThumbnail: vf.videoThumbnail || '',
      category: vf.category || 'tafsir_miracles',
      translations: {
        fr: { videoTitle: vf.videoTitle || '' },
        ar: { videoTitle: va.videoTitle || '' },
        en: { videoTitle: ve.videoTitle || '' },
        es: { videoTitle: vs.videoTitle || '' }
      }
    };
    await setDoc(doc(db, 'video_reels', String(videoDoc.id)), videoDoc);
  }

  // 5. Base de connaissances Hafiz IA
  log('5/6 : Migration de la base Hafiz IA...');
  const kList = Array.isArray(knowledgeData) ? knowledgeData : [];
  for (let i = 0; i < kList.length; i++) {
    const k = kList[i];
    await setDoc(doc(db, 'knowledge_base', `kb_${i + 1}`), {
      id: `kb_${i + 1}`,
      query: k.query || '',
      response: k.response || '',
      references: k.references || [],
      suggestions: k.suggestions || []
    });
  }

  // 6. Bundles & Métadonnées
  log('6/6 : Génération des bundles de téléchargement par langue et sync_metadata...');
  await setDoc(doc(db, 'bundles', 'discoveries_fr'), discFr);
  await setDoc(doc(db, 'bundles', 'discoveries_ar'), discAr);
  await setDoc(doc(db, 'bundles', 'discoveries_en'), discEn);
  await setDoc(doc(db, 'bundles', 'discoveries_es'), discEs);

  await setDoc(doc(db, 'bundles', 'video_feed_fr'), { videos: vFr });
  await setDoc(doc(db, 'bundles', 'video_feed_ar'), { videos: vAr });
  await setDoc(doc(db, 'bundles', 'video_feed_en'), { videos: vEn });
  await setDoc(doc(db, 'bundles', 'video_feed_es'), { videos: vEs });

  await setDoc(doc(db, 'bundles', 'featured_fr'), featFr);
  await setDoc(doc(db, 'bundles', 'featured_ar'), featAr);
  await setDoc(doc(db, 'bundles', 'featured_en'), featEn);
  await setDoc(doc(db, 'bundles', 'featured_es'), featEs);

  const syncMeta = {
    version: 1,
    lastUpdatedAt: new Date().toISOString(),
    counts: {
      domains: domainsList.length,
      discoveries: allDiscIds.length,
      details: allDetailIds.length,
      videos: vFr.length,
      knowledge: kList.length
    },
    languages: {
      fr: { version: 1, lastUpdated: new Date().toISOString() },
      ar: { version: 1, lastUpdated: new Date().toISOString() },
      en: { version: 1, lastUpdated: new Date().toISOString() },
      es: { version: 1, lastUpdated: new Date().toISOString() }
    }
  };
  await setDoc(doc(db, 'system', 'sync_metadata'), syncMeta);

  log('Migration intégrale terminée avec succès !');
  return { success: true, count: allDiscIds.length, detailsCount: allDetailIds.length };
}
