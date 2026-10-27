import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Recompile et met à jour les 4 bundles de découvertes (FR, AR, EN, ES)
 * pour que le mobile télécharge la version exacte mise à jour en 1 seule lecture.
 */
export async function updateDiscoveriesBundles(allDiscoveries) {
  const languages = ['fr', 'ar', 'en', 'es'];
  for (const lang of languages) {
    const list = allDiscoveries.map(d => ({
      id: Number(d.id),
      title: d.translations?.[lang]?.title || d.title || '',
      description: d.translations?.[lang]?.description || d.description || '',
      imageUrl: d.imageUrl || '',
      domain: d.translations?.[lang]?.domain || d.domain || '',
      surah: d.translations?.[lang]?.surah || d.surah || '',
      verse: d.verse || '',
      arabicText: d.arabicText || '',
      timestamp: d.timestamp || new Date().toISOString()
    }));
    await setDoc(doc(db, 'bundles', `discoveries_${lang}`), { discoveries: list });
  }
}

/**
 * Recompile et met à jour les 4 bundles de contenu à la une
 */
export async function updateFeaturedBundles(allFeatured) {
  const languages = ['fr', 'ar', 'en', 'es'];
  for (const lang of languages) {
    const list = allFeatured.map(f => ({
      id: Number(f.id),
      title: f.translations?.[lang]?.title || f.title || '',
      description: f.translations?.[lang]?.description || f.description || '',
      imageUrl: f.imageUrl || '',
      domain: f.translations?.[lang]?.domain || f.domain || '',
      surah: f.translations?.[lang]?.surah || f.surah || '',
      verse: f.verse || '',
      arabicText: f.arabicText || ''
    }));
    await setDoc(doc(db, 'bundles', `featured_${lang}`), { featuredContent: list });
  }
}

/**
 * Recompile et met à jour les 4 bundles de flux vidéo / reels
 */
export async function updateVideoBundles(allVideos) {
  const languages = ['fr', 'ar', 'en', 'es'];
  for (const lang of languages) {
    const list = allVideos.map(v => ({
      id: v.id,
      videoUrl: v.videoUrl || '',
      videoTitle: v.translations?.[lang]?.videoTitle || v.videoTitle || '',
      videoDuration: v.videoDuration || '',
      videoThumbnail: v.videoThumbnail || '',
      category: v.category || 'tafsir_miracles'
    }));
    await setDoc(doc(db, 'bundles', `video_feed_${lang}`), { videos: list });
  }
}

/**
 * Recompile le bundle des domaines scientifiques
 */
export async function updateDomainsBundle(allDomains) {
  await setDoc(doc(db, 'bundles', 'domains'), { domains: allDomains });
}

/**
 * Ajoute ou met à jour une fiche détaillée dans les bundles de détails modifiés par langue
 */
export async function updateModifiedDetailBundle(detailId, detailDoc) {
  const languages = ['fr', 'ar', 'en', 'es'];
  for (const lang of languages) {
    try {
      const bundleRef = doc(db, 'bundles', `modified_details_${lang}`);
      const snap = await getDoc(bundleRef);
      const existing = snap.exists() ? (snap.data().details || {}) : {};

      existing[String(detailId)] = {
        id: Number(detailId),
        category: detailDoc.category || '',
        heroImage: detailDoc.heroImage || '',
        thumbnail: detailDoc.thumbnail || '',
        videoUrl: detailDoc.videoUrl || '',
        videoDuration: detailDoc.videoDuration || '',
        videoThumbnail: detailDoc.videoThumbnail || '',
        arabicVerse: detailDoc.arabicVerse || '',
        diagrams: detailDoc.diagrams || [],
        timeline: detailDoc.timeline || [],
        relatedImages: detailDoc.relatedImages || [],
        title: detailDoc.translations?.[lang]?.title || detailDoc.title || '',
        surahReference: detailDoc.translations?.[lang]?.surahReference || detailDoc.surahReference || '',
        readTime: detailDoc.translations?.[lang]?.readTime || detailDoc.readTime || '',
        scientificExplanation: detailDoc.translations?.[lang]?.scientificExplanation || detailDoc.scientificExplanation || '',
        verseTranslation: detailDoc.translations?.[lang]?.verseTranslation || detailDoc.verseTranslation || '',
        verseCommentary: detailDoc.translations?.[lang]?.verseCommentary || detailDoc.verseCommentary || '',
        historicalContext: detailDoc.translations?.[lang]?.historicalContext || detailDoc.historicalContext || '',
        videoTitle: detailDoc.translations?.[lang]?.videoTitle || detailDoc.videoTitle || ''
      };

      await setDoc(bundleRef, { details: existing });
    } catch (e) {
      console.warn(`Erreur maj modified_details_${lang}:`, e);
    }
  }
}

/**
 * Supprime une fiche détaillée du bundle de détails modifiés
 */
export async function removeModifiedDetailBundle(detailId) {
  const languages = ['fr', 'ar', 'en', 'es'];
  for (const lang of languages) {
    try {
      const bundleRef = doc(db, 'bundles', `modified_details_${lang}`);
      const snap = await getDoc(bundleRef);
      if (snap.exists()) {
        const existing = snap.data().details || {};
        delete existing[String(detailId)];
        await setDoc(bundleRef, { details: existing });
      }
    } catch (e) {
      console.warn(`Erreur suppression modified_details_${lang}:`, e);
    }
  }
}

/**
 * Incrémente la version de synchronisation globale ET par langue
 */
export async function bumpSyncVersion(currentSyncMeta, counts = {}) {
  const newVersion = (currentSyncMeta?.version || 1) + 1;
  const now = new Date().toISOString();
  
  const updatedMeta = {
    ...currentSyncMeta,
    version: newVersion,
    lastUpdatedAt: now,
    counts: {
      ...currentSyncMeta?.counts,
      ...counts
    },
    languages: {
      fr: { version: newVersion, lastUpdated: now },
      ar: { version: newVersion, lastUpdated: now },
      en: { version: newVersion, lastUpdated: now },
      es: { version: newVersion, lastUpdated: now }
    }
  };

  await setDoc(doc(db, 'system', 'sync_metadata'), updatedMeta);
  return updatedMeta;
}
