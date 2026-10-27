import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  LayoutDashboard, 
  Layers, 
  Sparkles, 
  Star,
  FileText,
  Video, 
  Brain, 
  RefreshCw, 
  LogOut, 
  Plus, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Trash2,
  Edit,
  Save,
  X,
  Globe,
  Image as ImageIcon,
  Clock,
  Youtube
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { runInitialMigration } from '../../firebase/migration';
import { 
  updateDiscoveriesBundles, 
  updateFeaturedBundles, 
  updateVideoBundles, 
  updateDomainsBundle,
  updateModifiedDetailBundle,
  removeModifiedDetailBundle,
  bumpSyncVersion 
} from '../../firebase/bundleHelper';
import { Link } from 'react-router-dom';

// Helper pour extraire la miniature YouTube par défaut
function getYouTubeThumbnail(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return '';
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, domains, discoveries, details, featured, videos, knowledge, migration
  
  // Data states
  const [syncMeta, setSyncMeta] = useState(null);
  const [domains, setDomains] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [discoveryDetails, setDiscoveryDetails] = useState([]);
  const [featuredContent, setFeaturedContent] = useState([]);
  const [videos, setVideos] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Migration states
  const [migrationStatus, setMigrationStatus] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  // Modals states
  const [isDiscModalOpen, setIsDiscModalOpen] = useState(false);
  const [discModalMode, setDiscModalMode] = useState('add');
  const [currentDiscovery, setCurrentDiscovery] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState('add');
  const [currentDetail, setCurrentDetail] = useState(null);

  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainModalMode, setDomainModalMode] = useState('add');
  const [currentDomain, setCurrentDomain] = useState(null);

  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState(false);
  const [featuredModalMode, setFeaturedModalMode] = useState('add');
  const [currentFeatured, setCurrentFeatured] = useState(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoModalMode, setVideoModalMode] = useState('add');
  const [currentVideo, setCurrentVideo] = useState(null);

  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeModalMode, setKnowledgeModalMode] = useState('add');
  const [currentKnowledge, setCurrentKnowledge] = useState(null);

  // Shared language tab for forms
  const [langTab, setLangTab] = useState('fr');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Sync metadata
      const metaSnap = await getDoc(doc(db, 'system', 'sync_metadata'));
      if (metaSnap.exists()) {
        setSyncMeta(metaSnap.data());
      }

      // 2. Domains
      const domSnap = await getDocs(collection(db, 'scientific_domains'));
      setDomains(domSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => Number(a.id) - Number(b.id)));

      // 3. Discoveries
      const discSnap = await getDocs(collection(db, 'discoveries'));
      setDiscoveries(discSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => Number(a.id) - Number(b.id)));

      // 4. Discovery Details
      const detSnap = await getDocs(collection(db, 'discovery_details'));
      setDiscoveryDetails(detSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => Number(a.id) - Number(b.id)));

      // 5. Featured Content
      const featSnap = await getDocs(collection(db, 'featured_content'));
      setFeaturedContent(featSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => Number(a.id) - Number(b.id)));

      // 6. Videos
      const vidSnap = await getDocs(collection(db, 'video_reels'));
      setVideos(vidSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 7. Knowledge
      const knowSnap = await getDocs(collection(db, 'knowledge_base'));
      setKnowledge(knowSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Erreur de chargement Firebase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -------------------------------------------------------------------------
  // MIGRATION INITIALE
  // -------------------------------------------------------------------------
  const handleStartMigration = async () => {
    if (!window.confirm('Voulez-vous importer et synchroniser toutes les données des fichiers JSON vers Firestore ?')) {
      return;
    }
    setIsMigrating(true);
    setMigrationStatus('Initialisation...');
    setMigrationSuccess(false);

    try {
      await runInitialMigration((msg) => setMigrationStatus(msg));
      setMigrationSuccess(true);
      await fetchData();
    } catch (err) {
      console.error(err);
      setMigrationStatus("Erreur durant l'importation : " + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION DOMAINES (CRUD)
  // -------------------------------------------------------------------------
  const handleOpenDomainModal = (item = null) => {
    if (item) {
      setDomainModalMode('edit');
      setCurrentDomain(JSON.parse(JSON.stringify(item)));
    } else {
      setDomainModalMode('add');
      const nextId = domains.length > 0 ? Math.max(...domains.map(d => Number(d.id) || 0)) + 1 : 1;
      setCurrentDomain({
        id: nextId,
        nameFr: '',
        nameAr: '',
        nameEn: '',
        nameEs: '',
        description: '',
        descriptionAr: '',
        descriptionEn: '',
        descriptionEs: '',
        icon: 'atom',
        contentCount: 0,
        category: 'general',
        isPopular: true
      });
    }
    setIsDomainModalOpen(true);
  };

  const handleSaveDomain = async (e) => {
    e.preventDefault();
    if (!currentDomain) return;
    try {
      await setDoc(doc(db, 'scientific_domains', String(currentDomain.id)), currentDomain);
      const updatedDomains = domains.some(d => String(d.id) === String(currentDomain.id))
        ? domains.map(d => String(d.id) === String(currentDomain.id) ? currentDomain : d)
        : [...domains, currentDomain];
      
      await updateDomainsBundle(updatedDomains);
      const newMeta = await bumpSyncVersion(syncMeta, { domains: updatedDomains.length });
      setSyncMeta(newMeta);
      setDomains(updatedDomains);
      setSaveSuccess('Domaine enregistré et version serveur mise à jour !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsDomainModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement domaine: " + err.message);
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!window.confirm(`Supprimer le domaine #${id} ?`)) return;
    try {
      await deleteDoc(doc(db, 'scientific_domains', String(id)));
      const updatedDomains = domains.filter(d => String(d.id) !== String(id));
      await updateDomainsBundle(updatedDomains);
      const newMeta = await bumpSyncVersion(syncMeta, { domains: updatedDomains.length });
      setSyncMeta(newMeta);
      setDomains(updatedDomains);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION DECOUVERTES (CRUD)
  // -------------------------------------------------------------------------
  const handleOpenDiscoveryModal = (item = null) => {
    if (item) {
      setDiscModalMode('edit');
      const cloned = JSON.parse(JSON.stringify(item));
      if (!cloned.translations) cloned.translations = {};
      ['fr', 'ar', 'en', 'es'].forEach(l => {
        if (!cloned.translations[l]) cloned.translations[l] = { title: '', description: '', domain: '', surah: '' };
      });
      setCurrentDiscovery(cloned);
    } else {
      setDiscModalMode('add');
      const nextId = discoveries.length > 0 ? Math.max(...discoveries.map(d => Number(d.id) || 0)) + 1 : 1;
      const defaultDomain = domains[0]?.nameFr || 'Science Moderne';
      setCurrentDiscovery({
        id: nextId,
        imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?fm=jpg&q=60&w=3000',
        surah: '',
        verse: '',
        arabicText: '',
        domain: defaultDomain,
        timestamp: new Date().toISOString(),
        translations: {
          fr: { title: '', description: '', domain: defaultDomain, surah: '' },
          ar: { title: '', description: '', domain: domains[0]?.nameAr || 'العلوم الحديثة', surah: '' },
          en: { title: '', description: '', domain: domains[0]?.nameEn || 'Modern Science', surah: '' },
          es: { title: '', description: '', domain: domains[0]?.nameEs || 'Ciencia Moderna', surah: '' }
        }
      });
    }
    setLangTab('fr');
    setIsDiscModalOpen(true);
  };

  const handleSaveDiscovery = async (e) => {
    e.preventDefault();
    if (!currentDiscovery) return;
    try {
      const payload = {
        ...currentDiscovery,
        title: currentDiscovery.translations?.fr?.title || currentDiscovery.title || '',
        description: currentDiscovery.translations?.fr?.description || currentDiscovery.description || '',
        domain: currentDiscovery.translations?.fr?.domain || currentDiscovery.domain || '',
        surah: currentDiscovery.translations?.fr?.surah || currentDiscovery.surah || '',
      };

      // 1. Sauvegarde dans la collection discoveries
      await setDoc(doc(db, 'discoveries', String(payload.id)), payload);
      
      const updatedList = discoveries.some(d => String(d.id) === String(payload.id))
        ? discoveries.map(d => String(d.id) === String(payload.id) ? payload : d)
        : [...discoveries, payload];

      // 2. Recompilation des bundles de téléchargement par langue
      await updateDiscoveriesBundles(updatedList);

      // 3. Incrémentation de la version globale et par langue
      const newMeta = await bumpSyncVersion(syncMeta, { discoveries: updatedList.length });
      setSyncMeta(newMeta);
      setDiscoveries(updatedList);

      setSaveSuccess('Découverte enregistrée, bundles re-compilés et signalement mobile activé !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsDiscModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement découverte: " + err.message);
    }
  };

  const handleDeleteDiscovery = async (id) => {
    if (!window.confirm(`Supprimer la découverte #${id} ?`)) return;
    try {
      await deleteDoc(doc(db, 'discoveries', String(id)));
      const updatedList = discoveries.filter(d => String(d.id) !== String(id));
      await updateDiscoveriesBundles(updatedList);
      const newMeta = await bumpSyncVersion(syncMeta, { discoveries: updatedList.length });
      setSyncMeta(newMeta);
      setDiscoveries(updatedList);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION DETAILS DECOUVERTES (CRUD COMPLET AVEC IMAGES)
  // -------------------------------------------------------------------------
  const handleOpenDetailModal = (item = null) => {
    if (item && item.heroImage !== undefined) {
      setDetailModalMode('edit');
      const cloned = JSON.parse(JSON.stringify(item));
      if (!cloned.diagrams) cloned.diagrams = [];
      if (!cloned.relatedImages) cloned.relatedImages = [];
      if (!cloned.timeline) cloned.timeline = [];
      if (!cloned.translations) cloned.translations = {};
      ['fr', 'ar', 'en', 'es'].forEach(l => {
        if (!cloned.translations[l]) cloned.translations[l] = { title: '', surahReference: '', readTime: '8 min', scientificExplanation: '', verseTranslation: '', verseCommentary: '', historicalContext: '' };
      });
      setCurrentDetail(cloned);
    } else {
      setDetailModalMode('add');
      const targetId = item?.id ? Number(item.id) : (discoveryDetails.length > 0 ? Math.max(...discoveryDetails.map(d => Number(d.id) || 0)) + 1 : 1);
      setCurrentDetail({
        id: targetId,
        category: domains[0]?.nameFr || 'Science moderne',
        heroImage: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?fm=jpg&q=60&w=3000',
        thumbnail: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?fm=jpg&q=60&w=3000',
        videoUrl: 'https://youtu.be/TJhLcE57Djs',
        videoDuration: '4 minutes',
        videoThumbnail: 'https://img.youtube.com/vi/TJhLcE57Djs/hqdefault.jpg',
        arabicVerse: '',
        diagrams: [
          { image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800', caption: 'Schéma explicatif' }
        ],
        relatedImages: [
          { url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800' }
        ],
        timeline: [
          { period: 'VIIe siècle', event: 'Révélation du Coran' }
        ],
        translations: {
          fr: { title: '', surahReference: '', readTime: '8 min de lecture', scientificExplanation: '', verseTranslation: '', verseCommentary: '', historicalContext: '' },
          ar: { title: '', surahReference: '', readTime: '8 دقائق للقراءة', scientificExplanation: '', verseTranslation: '', verseCommentary: '', historicalContext: '' },
          en: { title: '', surahReference: '', readTime: '8 min read', scientificExplanation: '', verseTranslation: '', verseCommentary: '', historicalContext: '' },
          es: { title: '', surahReference: '', readTime: '8 min de lectura', scientificExplanation: '', verseTranslation: '', verseCommentary: '', historicalContext: '' }
        }
      });
    }
    setLangTab('fr');
    setIsDetailModalOpen(true);
  };

  const handleSaveDetail = async (e) => {
    e.preventDefault();
    if (!currentDetail) return;
    try {
      const autoThumb = getYouTubeThumbnail(currentDetail.videoUrl);
      const payload = {
        ...currentDetail,
        videoThumbnail: currentDetail.videoThumbnail || autoThumb,
        title: currentDetail.translations?.fr?.title || currentDetail.title || '',
        surahReference: currentDetail.translations?.fr?.surahReference || currentDetail.surahReference || '',
        readTime: currentDetail.translations?.fr?.readTime || currentDetail.readTime || '',
        scientificExplanation: currentDetail.translations?.fr?.scientificExplanation || currentDetail.scientificExplanation || '',
        verseTranslation: currentDetail.translations?.fr?.verseTranslation || currentDetail.verseTranslation || '',
        verseCommentary: currentDetail.translations?.fr?.verseCommentary || currentDetail.verseCommentary || '',
        historicalContext: currentDetail.translations?.fr?.historicalContext || currentDetail.historicalContext || '',
      };

      await setDoc(doc(db, 'discovery_details', String(payload.id)), payload);
      const updatedDetails = discoveryDetails.some(d => String(d.id) === String(payload.id))
        ? discoveryDetails.map(d => String(d.id) === String(payload.id) ? payload : d)
        : [...discoveryDetails, payload];

      await updateModifiedDetailBundle(payload.id, payload);
      const newMeta = await bumpSyncVersion(syncMeta, { details: updatedDetails.length });
      setSyncMeta(newMeta);
      setDiscoveryDetails(updatedDetails);

      setSaveSuccess('Fiche détaillée enregistrée avec succès et synchronisée vers le mobile !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsDetailModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement détail: " + err.message);
    }
  };

  const handleDeleteDetail = async (id) => {
    if (!window.confirm(`Supprimer la fiche détaillée #${id} ?`)) return;
    try {
      await deleteDoc(doc(db, 'discovery_details', String(id)));
      const updatedDetails = discoveryDetails.filter(d => String(d.id) !== String(id));
      await removeModifiedDetailBundle(id);
      const newMeta = await bumpSyncVersion(syncMeta, { details: updatedDetails.length });
      setSyncMeta(newMeta);
      setDiscoveryDetails(updatedDetails);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION CONTENU A LA UNE (FEATURED_CONTENT CRUD)
  // -------------------------------------------------------------------------
  const handleOpenFeaturedModal = (item = null) => {
    if (item) {
      setFeaturedModalMode('edit');
      const cloned = JSON.parse(JSON.stringify(item));
      if (!cloned.translations) cloned.translations = {};
      ['fr', 'ar', 'en', 'es'].forEach(l => {
        if (!cloned.translations[l]) cloned.translations[l] = { title: '', description: '', domain: '', surah: '' };
      });
      setCurrentFeatured(cloned);
    } else {
      setFeaturedModalMode('add');
      const nextId = featuredContent.length > 0 ? Math.max(...featuredContent.map(f => Number(f.id) || 0)) + 1 : 1;
      const defaultDomain = domains[0]?.nameFr || 'Astronomie';
      setCurrentFeatured({
        id: nextId,
        imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1000',
        surah: 'Adh-Dhariyat',
        verse: '51:47',
        arabicText: 'وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ',
        domain: defaultDomain,
        translations: {
          fr: { title: '', description: '', domain: defaultDomain, surah: 'Adh-Dhariyat' },
          ar: { title: '', description: '', domain: domains[0]?.nameAr || 'علم الفلك', surah: 'الذاريات' },
          en: { title: '', description: '', domain: domains[0]?.nameEn || 'Astronomy', surah: 'Adh-Dhariyat' },
          es: { title: '', description: '', domain: domains[0]?.nameEs || 'Astronomía', surah: 'Adh-Dhariyat' }
        }
      });
    }
    setLangTab('fr');
    setIsFeaturedModalOpen(true);
  };

  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    if (!currentFeatured) return;
    try {
      const payload = {
        ...currentFeatured,
        title: currentFeatured.translations?.fr?.title || currentFeatured.title || '',
        description: currentFeatured.translations?.fr?.description || currentFeatured.description || '',
        domain: currentFeatured.translations?.fr?.domain || currentFeatured.domain || '',
        surah: currentFeatured.translations?.fr?.surah || currentFeatured.surah || '',
      };
      await setDoc(doc(db, 'featured_content', String(payload.id)), payload);
      const updatedList = featuredContent.some(f => String(f.id) === String(payload.id))
        ? featuredContent.map(f => String(f.id) === String(payload.id) ? payload : f)
        : [...featuredContent, payload];

      await updateFeaturedBundles(updatedList);
      const newMeta = await bumpSyncVersion(syncMeta, { featured: updatedList.length });
      setSyncMeta(newMeta);
      setFeaturedContent(updatedList);

      setSaveSuccess('Contenu à la une enregistré et bundle mobile mis à jour !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsFeaturedModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement contenu à la une: " + err.message);
    }
  };

  const handleDeleteFeatured = async (id) => {
    if (!window.confirm(`Supprimer le contenu à la une #${id} ?`)) return;
    try {
      await deleteDoc(doc(db, 'featured_content', String(id)));
      const updatedList = featuredContent.filter(f => String(f.id) !== String(id));
      await updateFeaturedBundles(updatedList);
      const newMeta = await bumpSyncVersion(syncMeta, { featured: updatedList.length });
      setSyncMeta(newMeta);
      setFeaturedContent(updatedList);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION VIDEOS & REELS (CRUD)
  // -------------------------------------------------------------------------
  const handleOpenVideoModal = (item = null) => {
    if (item) {
      setVideoModalMode('edit');
      setCurrentVideo(JSON.parse(JSON.stringify(item)));
    } else {
      setVideoModalMode('add');
      const nextNum = videos.length + 1;
      setCurrentVideo({
        id: `reel_${String(nextNum).padStart(3, '0')}`,
        videoUrl: 'https://youtu.be/TJhLcE57Djs',
        videoDuration: '4 minutes',
        videoThumbnail: 'https://img.youtube.com/vi/TJhLcE57Djs/hqdefault.jpg',
        category: 'tafsir_miracles',
        translations: {
          fr: { videoTitle: '' },
          ar: { videoTitle: '' },
          en: { videoTitle: '' },
          es: { videoTitle: '' }
        }
      });
    }
    setLangTab('fr');
    setIsVideoModalOpen(true);
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!currentVideo) return;
    try {
      const autoThumb = getYouTubeThumbnail(currentVideo.videoUrl);
      if (autoThumb) {
        currentVideo.videoThumbnail = autoThumb;
      }
      await setDoc(doc(db, 'video_reels', String(currentVideo.id)), currentVideo);
      const updatedList = videos.some(v => String(v.id) === String(currentVideo.id))
        ? videos.map(v => String(v.id) === String(currentVideo.id) ? currentVideo : v)
        : [...videos, currentVideo];

      await updateVideoBundles(updatedList);
      const newMeta = await bumpSyncVersion(syncMeta, { videos: updatedList.length });
      setSyncMeta(newMeta);
      setVideos(updatedList);

      setSaveSuccess('Vidéo enregistrée avec miniature YouTube automatique !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsVideoModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement vidéo: " + err.message);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm(`Supprimer la vidéo ${id} ?`)) return;
    try {
      await deleteDoc(doc(db, 'video_reels', String(id)));
      const updatedList = videos.filter(v => String(v.id) !== String(id));
      await updateVideoBundles(updatedList);
      const newMeta = await bumpSyncVersion(syncMeta, { videos: updatedList.length });
      setSyncMeta(newMeta);
      setVideos(updatedList);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // GESTION BASE HAFIZ IA (CRUD)
  // -------------------------------------------------------------------------
  const handleOpenKnowledgeModal = (item = null) => {
    if (item) {
      setKnowledgeModalMode('edit');
      setCurrentKnowledge(JSON.parse(JSON.stringify(item)));
    } else {
      setKnowledgeModalMode('add');
      const nextNum = knowledge.length + 1;
      setCurrentKnowledge({
        id: `kb_${nextNum}`,
        query: '',
        response: '',
        references: [],
        suggestions: []
      });
    }
    setIsKnowledgeModalOpen(true);
  };

  const handleSaveKnowledge = async (e) => {
    e.preventDefault();
    if (!currentKnowledge) return;
    try {
      await setDoc(doc(db, 'knowledge_base', String(currentKnowledge.id)), currentKnowledge);
      const updatedList = knowledge.some(k => String(k.id) === String(currentKnowledge.id))
        ? knowledge.map(k => String(k.id) === String(currentKnowledge.id) ? currentKnowledge : k)
        : [...knowledge, currentKnowledge];

      const newMeta = await bumpSyncVersion(syncMeta, { knowledge: updatedList.length });
      setSyncMeta(newMeta);
      setKnowledge(updatedList);

      setSaveSuccess('Connaissance Hafiz enregistrée avec succès !');
      setTimeout(() => setSaveSuccess(''), 3000);
      setIsKnowledgeModalOpen(false);
    } catch (err) {
      alert("Erreur enregistrement connaissance: " + err.message);
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm(`Supprimer cette connaissance Hafiz ?`)) return;
    try {
      await deleteDoc(doc(db, 'knowledge_base', String(id)));
      const updatedList = knowledge.filter(k => String(k.id) !== String(id));
      const newMeta = await bumpSyncVersion(syncMeta, { knowledge: updatedList.length });
      setSyncMeta(newMeta);
      setKnowledge(updatedList);
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtrages
  const filteredDiscoveries = discoveries.filter(d => {
    const titleFr = d.translations?.fr?.title || '';
    const titleAr = d.translations?.ar?.title || '';
    const q = searchTerm.toLowerCase();
    return String(d.id).includes(q) || titleFr.toLowerCase().includes(q) || titleAr.includes(q);
  });

  const filteredDetails = discoveryDetails.filter(d => {
    const titleFr = d.translations?.fr?.title || '';
    const cat = d.category || '';
    const q = searchTerm.toLowerCase();
    return String(d.id).includes(q) || titleFr.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
  });

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Navigation FIXE */}
      <header className="bg-emerald-900 text-white shadow-lg flex-shrink-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md font-bold text-emerald-950 text-xl">
              IQ
            </div>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                IQra Dine <span className="text-xs bg-emerald-800 text-amber-300 px-2 py-0.5 rounded-full font-medium">Dashboard Admin</span>
              </h1>
              <p className="text-xs text-emerald-300">Connecté en tant que : {user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 px-3 py-2 rounded-lg transition-colors border border-emerald-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir le site public
            </Link>

            <button 
              onClick={() => logout()}
              className="inline-flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Sidebar FIXE + Main SCROLLABLE */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar FIXE à gauche */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4 space-y-1.5 flex-shrink-0 overflow-y-auto h-full">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
            Gestion des Contenus
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            Vue d'ensemble
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'domains'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            Domaines ({domains.length})
          </button>

          <button
            onClick={() => setActiveTab('discoveries')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'discoveries'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            Découvertes ({discoveries.length})
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'details'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-600" />
            Détails Découvertes ({discoveryDetails.length})
          </button>

          <button
            onClick={() => setActiveTab('featured')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'featured'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500" />
            Contenu à la Une ({featuredContent.length})
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'videos'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Video className="w-4 h-4 text-emerald-600" />
            Vidéos & Reels ({videos.length})
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'knowledge'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Brain className="w-4 h-4 text-emerald-600" />
            Base Hafiz IA ({knowledge.length})
          </button>

          <div className="pt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
            Synchronisation
          </div>

          <button
            onClick={() => setActiveTab('migration')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'migration'
                ? 'bg-amber-50 text-amber-900 font-semibold border-l-4 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            Migration & Sync
          </button>
        </aside>

        {/* Section droite SCROLLABLE */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto h-full max-w-7xl mx-auto w-full">
          {saveSuccess && (
            <div className="mb-6 p-4 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm border border-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-sm">{saveSuccess}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vue d'ensemble du Système</h2>
                <p className="text-sm text-gray-500 mt-1">État de la synchronisation Firestore et statistiques globales</p>
              </div>

              {/* Version & Sync Card */}
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="bg-amber-400/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/30">
                      Mode Local-First Actif
                    </span>
                    <h3 className="text-2xl font-bold mt-3">Version Globale Serveur : v{syncMeta?.version || 1}.0</h3>
                    <p className="text-emerald-200 text-sm mt-1">
                      Dernière mise à jour : {syncMeta?.lastUpdatedAt ? new Date(syncMeta.lastUpdatedAt).toLocaleString() : 'Jamais'}
                    </p>
                  </div>

                  <button
                    onClick={fetchData}
                    className="self-start md:self-auto bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 border border-white/20 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualiser les données
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-emerald-600 font-bold text-3xl">{discoveries.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">Découvertes</div>
                  <div className="text-xs text-gray-400 mt-1">4 langues</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-teal-600 font-bold text-3xl">{discoveryDetails.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">Fiches Détaillées</div>
                  <div className="text-xs text-gray-400 mt-1">Analyses & sourates</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-amber-500 font-bold text-3xl">{featuredContent.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">À la Une</div>
                  <div className="text-xs text-gray-400 mt-1">Carrousel mobile</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-emerald-600 font-bold text-3xl">{domains.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">Domaines</div>
                  <div className="text-xs text-gray-400 mt-1">Disciplines</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-amber-600 font-bold text-3xl">{videos.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">Reels Vidéos</div>
                  <div className="text-xs text-gray-400 mt-1">YouTube Shorts</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-emerald-600 font-bold text-3xl">{knowledge.length}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">Base Hafiz IA</div>
                  <div className="text-xs text-gray-400 mt-1">RAG coranique</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOMAINES */}
          {activeTab === 'domains' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Domaines Scientifiques</h2>
                  <p className="text-sm text-gray-500 mt-1">Catégories scientifiques majeures</p>
                </div>

                <button
                  onClick={() => handleOpenDomainModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Domaine
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {domains.map((dom) => (
                  <div key={dom.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                          ID #{dom.id}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">Icône: {dom.icon}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{dom.nameFr || dom.nameEn}</h3>
                      <p className="text-sm font-arabic text-emerald-700 text-right mt-0.5" dir="rtl">{dom.nameAr}</p>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-3">{dom.description}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenDomainModal(dom)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier le domaine"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(dom.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer le domaine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DECOUVERTES */}
          {activeTab === 'discoveries' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Catalogue des Découvertes</h2>
                  <p className="text-sm text-gray-500 mt-1">Découvertes avec domaine rattaché et concordances</p>
                </div>

                <button
                  onClick={() => handleOpenDiscoveryModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle découverte
                </button>
              </div>

              {/* Barre de recherche */}
              <div className="relative max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par ID ou titre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Table des découvertes */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Image</th>
                        <th className="py-3.5 px-4">Titre (Français)</th>
                        <th className="py-3.5 px-4">Domaine Rattaché</th>
                        <th className="py-3.5 px-4">Sourate & Verset</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredDiscoveries.slice(0, 50).map((item) => (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-600">#{item.id}</td>
                          <td className="py-3.5 px-4">
                            <img 
                              src={item.imageUrl} 
                              alt="Illustration" 
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200" 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 max-w-xs truncate">
                            {item.translations?.fr?.title || item.title || 'Non traduit'}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-emerald-800">
                            <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                              {item.translations?.fr?.domain || item.domain || 'Général'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 text-xs">
                            <span className="bg-gray-100 px-2 py-1 rounded font-medium text-gray-800">
                              {item.surah || item.translations?.fr?.surah || '—'} ({item.verse || '—'})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                const det = discoveryDetails.find(d => Number(d.id) === Number(item.id));
                                if (det) {
                                  handleOpenDetailModal(det);
                                } else {
                                  handleOpenDetailModal({ id: item.id });
                                }
                              }}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Voir / Éditer la fiche détaillée"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDiscoveryModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDiscovery(item.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DETAILS DECOUVERTES (AVEC TOUTES LES IMAGES) */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails des Découvertes</h2>
                  <p className="text-sm text-gray-500 mt-1">Fiches d'analyses scientifiques complètes, schémas et images</p>
                </div>

                <button
                  onClick={() => handleOpenDetailModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Détail
                </button>
              </div>

              {/* Barre de recherche */}
              <div className="relative max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par ID, titre ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Table des détails */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3.5 px-4">ID Lié</th>
                        <th className="py-3.5 px-4">Bannière</th>
                        <th className="py-3.5 px-4">Titre (Français)</th>
                        <th className="py-3.5 px-4">Catégorie</th>
                        <th className="py-3.5 px-4">Schémas</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredDetails.slice(0, 50).map((det) => (
                        <tr key={det.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-600">#{det.id}</td>
                          <td className="py-3.5 px-4">
                            <img 
                              src={det.thumbnail || det.heroImage} 
                              alt="Hero" 
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200" 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 max-w-xs truncate">
                            {det.translations?.fr?.title || det.title || 'Fiche sans titre'}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full">
                              {det.category || 'Général'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {det.diagrams?.length || 0} schémas | {det.relatedImages?.length || 0} images
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDetailModal(det)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier la fiche complète"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDetail(det.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer la fiche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONTENU A LA UNE (FEATURED_CONTENT) */}
          {activeTab === 'featured' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Contenu à la Une (Carrousel Accueil)</h2>
                  <p className="text-sm text-gray-500 mt-1">Éléments phares affichés en grand carrousel sur l'application mobile</p>
                </div>

                <button
                  onClick={() => handleOpenFeaturedModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Contenu à la Une
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredContent.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="relative h-44 bg-gray-900">
                      <img 
                        src={item.imageUrl} 
                        alt="Illustration à la une" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="absolute top-2 left-2 bg-amber-500 text-emerald-950 text-xs font-bold px-2 py-0.5 rounded shadow">
                        #{item.id} À la Une
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-emerald-700 mb-1">{item.translations?.fr?.domain || item.domain || 'Général'}</div>
                        <h4 className="font-bold text-gray-900 text-base line-clamp-2">
                          {item.translations?.fr?.title || item.title || 'Sans titre'}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.translations?.fr?.description || item.description || ''}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          Sourate: {item.surah || item.translations?.fr?.surah} ({item.verse})
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleOpenFeaturedModal(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFeatured(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: VIDEOS & REELS */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Vidéos & Reels Shorts</h2>
                  <p className="text-sm text-gray-500 mt-1">Miniatures YouTube récupérées automatiquement par défaut</p>
                </div>

                <button
                  onClick={() => handleOpenVideoModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Reel / Vidéo
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {videos.map((vid) => {
                  const ytThumb = getYouTubeThumbnail(vid.videoUrl);
                  const displayThumb = ytThumb || vid.videoThumbnail;

                  return (
                    <div key={vid.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="relative h-44 bg-black">
                        <img 
                          src={displayThumb} 
                          alt="Miniature YouTube" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600'; }}
                        />
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono">
                          {vid.videoDuration || 'Court'}
                        </span>
                        {ytThumb && (
                          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                            YouTube
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-2">
                            {vid.translations?.fr?.videoTitle || vid.videoTitle}
                          </h4>
                          <p className="text-xs text-emerald-700 font-arabic text-right mt-1" dir="rtl">
                            {vid.translations?.ar?.videoTitle || ''}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <a 
                            href={vid.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Voir sur YouTube
                          </a>

                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenVideoModal(vid)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(vid.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: BASE HAFIZ IA */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Base de Connaissances - Assistant Hafiz IA</h2>
                  <p className="text-sm text-gray-500 mt-1">Données de référence injectées dans le prompt RAG pour l'IA</p>
                </div>

                <button
                  onClick={() => handleOpenKnowledgeModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Connaissance
                </button>
              </div>

              <div className="space-y-4">
                {knowledge.map((k) => (
                  <div key={k.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-emerald-900 text-base">
                        Question / Intention : « {k.query} »
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenKnowledgeModal(k)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKnowledge(k.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {k.response}
                    </p>
                    {k.references && k.references.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <strong>Références :</strong> {k.references.join(' | ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: MIGRATION */}
          {activeTab === 'migration' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <RefreshCw className={`w-7 h-7 ${isMigrating ? 'animate-spin' : ''}`} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Migration & Synchronisation Initiale</h2>
                <p className="text-sm text-gray-600">
                  Charge en un clic l'intégralité des 250+ découvertes, 350 fiches détaillées, contenu à la une, domaines, vidéos et base Hafiz des fichiers JSON vers Firestore.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Fusionne les fichiers multilingues (FR, AR, EN, ES) par ID unique.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Importe les fiches détaillées complètes dans la collection <code>discovery_details</code>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Importe le contenu à la une dans la collection <code>featured_content</code>.</span>
                  </div>
                </div>

                {migrationStatus && (
                  <div className={`p-4 rounded-xl text-sm ${
                    migrationSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="font-semibold">Statut :</p>
                    <p className="mt-1 font-mono text-xs">{migrationStatus}</p>
                  </div>
                )}

                <button
                  onClick={handleStartMigration}
                  disabled={isMigrating}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMigrating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Migration en cours (veuillez patienter)...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Lancer la Migration Intégrale vers Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: DOMAINE */}
      {/* ------------------------------------------------------------------- */}
      {isDomainModalOpen && currentDomain && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {domainModalMode === 'add' ? 'Nouveau Domaine Scientifique' : `Modifier Domaine #${currentDomain.id}`}
              </h3>
              <button onClick={() => setIsDomainModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDomain} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom Français</label>
                  <input
                    type="text"
                    required
                    value={currentDomain.nameFr || ''}
                    onChange={(e) => setCurrentDomain({...currentDomain, nameFr: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom Arabe</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={currentDomain.nameAr || ''}
                    onChange={(e) => setCurrentDomain({...currentDomain, nameAr: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-arabic text-right focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom Anglais</label>
                  <input
                    type="text"
                    value={currentDomain.nameEn || ''}
                    onChange={(e) => setCurrentDomain({...currentDomain, nameEn: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom Espagnol</label>
                  <input
                    type="text"
                    value={currentDomain.nameEs || ''}
                    onChange={(e) => setCurrentDomain({...currentDomain, nameEs: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description (Français)</label>
                <textarea
                  rows="3"
                  value={currentDomain.description || ''}
                  onChange={(e) => setCurrentDomain({...currentDomain, description: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom Icône (ex: atom, moon, mountain)</label>
                  <input
                    type="text"
                    value={currentDomain.icon || 'atom'}
                    onChange={(e) => setCurrentDomain({...currentDomain, icon: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={currentDomain.isPopular || false}
                    onChange={(e) => setCurrentDomain({...currentDomain, isPopular: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="isPopular" className="text-sm font-semibold text-gray-700">Domaine Populaire</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsDomainModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: DECOUVERTE */}
      {/* ------------------------------------------------------------------- */}
      {isDiscModalOpen && currentDiscovery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {discModalMode === 'add' ? 'Créer une Nouvelle Découverte' : `Modifier la Découverte #${currentDiscovery.id}`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Formulaire multilingue avec domaine rattaché</p>
              </div>
              <button onClick={() => setIsDiscModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscovery} className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Domaine Rattaché</label>
                  <select
                    value={currentDiscovery.domain || domains[0]?.nameFr}
                    onChange={(e) => {
                      const selDomain = domains.find(d => d.nameFr === e.target.value);
                      const updated = { ...currentDiscovery, domain: e.target.value };
                      if (selDomain && updated.translations) {
                        if (updated.translations.fr) updated.translations.fr.domain = selDomain.nameFr;
                        if (updated.translations.ar) updated.translations.ar.domain = selDomain.nameAr;
                        if (updated.translations.en) updated.translations.en.domain = selDomain.nameEn;
                        if (updated.translations.es) updated.translations.es.domain = selDomain.nameEs;
                      }
                      setCurrentDiscovery(updated);
                    }}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.nameFr || d.nameEn}>{d.nameFr || d.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Numéro Verset</label>
                  <input
                    type="text"
                    placeholder="ex: 51:47"
                    value={currentDiscovery.verse || ''}
                    onChange={(e) => setCurrentDiscovery({...currentDiscovery, verse: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={currentDiscovery.imageUrl || ''}
                    onChange={(e) => setCurrentDiscovery({...currentDiscovery, imageUrl: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                {currentDiscovery.imageUrl && (
                  <div className="sm:col-span-3 flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200">
                    <img src={currentDiscovery.imageUrl} alt="Aperçu" className="w-16 h-12 object-cover rounded-lg" onError={(e) => e.target.style.display='none'} />
                    <span className="text-xs text-gray-500 truncate">{currentDiscovery.imageUrl}</span>
                  </div>
                )}

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Texte Coranique en Arabe</label>
                  <textarea
                    rows="2"
                    dir="rtl"
                    value={currentDiscovery.arabicText || ''}
                    onChange={(e) => setCurrentDiscovery({...currentDiscovery, arabicText: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-base font-arabic text-right"
                  ></textarea>
                </div>
              </div>

              {/* Onglets de Langue */}
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mr-2">Langue :</span>

                  {[
                    { key: 'fr', label: '🇫🇷 Français' },
                    { key: 'ar', label: '🇸🇦 Arabe' },
                    { key: 'en', label: '🇬🇧 Anglais' },
                    { key: 'es', label: '🇪🇸 Espagnol' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setLangTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        langTab === tab.key 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Titre ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        required
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDiscovery.translations?.[langTab]?.title || ''}
                        onChange={(e) => {
                          const updated = { ...currentDiscovery };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].title = e.target.value;
                          setCurrentDiscovery(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nom Sourate ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDiscovery.translations?.[langTab]?.surah || ''}
                        onChange={(e) => {
                          const updated = { ...currentDiscovery };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].surah = e.target.value;
                          setCurrentDiscovery(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Explication / Résumé ({langTab.toUpperCase()})</label>
                    <textarea
                      rows="4"
                      required
                      dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                      value={currentDiscovery.translations?.[langTab]?.description || ''}
                      onChange={(e) => {
                        const updated = { ...currentDiscovery };
                        if (!updated.translations[langTab]) updated.translations[langTab] = {};
                        updated.translations[langTab].description = e.target.value;
                        setCurrentDiscovery(updated);
                      }}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsDiscModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 3: DETAIL DECOUVERTE (AVEC PREVISUALISATION DE TOUTES LES IMAGES) */}
      {/* ------------------------------------------------------------------- */}
      {isDetailModalOpen && currentDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {detailModalMode === 'add' ? 'Nouvelle Fiche Détaillée' : `Modifier Fiche Détaillée #${currentDetail.id}`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Formulaire complet avec aperçu de toutes les images, schémas et timeline</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetail} className="space-y-6">
              {/* SECTION IMAGES AVEC APERÇU VISUEL */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  Images Principales & Médias
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Hero Image */}
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700">Image Hero (Grande Bannière)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={currentDetail.heroImage || ''}
                      onChange={(e) => setCurrentDetail({...currentDetail, heroImage: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                    />
                    {currentDetail.heroImage && (
                      <div className="h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <img src={currentDetail.heroImage} alt="Hero" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                      </div>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700">Miniature (Thumbnail)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={currentDetail.thumbnail || ''}
                      onChange={(e) => setCurrentDetail({...currentDetail, thumbnail: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                    />
                    {currentDetail.thumbnail && (
                      <div className="h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <img src={currentDetail.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                      </div>
                    )}
                  </div>

                  {/* Vidéo YouTube & Miniature Vidéo */}
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700">Lien Vidéo YouTube</label>
                    <input
                      type="text"
                      placeholder="https://youtu.be/..."
                      value={currentDetail.videoUrl || ''}
                      onChange={(e) => {
                        const url = e.target.value;
                        const autoYt = getYouTubeThumbnail(url);
                        setCurrentDetail({
                          ...currentDetail,
                          videoUrl: url,
                          videoThumbnail: autoYt || currentDetail.videoThumbnail
                        });
                      }}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Durée (ex: 4 minutes)"
                        value={currentDetail.videoDuration || ''}
                        onChange={(e) => setCurrentDetail({...currentDetail, videoDuration: e.target.value})}
                        className="w-1/2 p-2 border border-gray-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const auto = getYouTubeThumbnail(currentDetail.videoUrl);
                          if (auto) setCurrentDetail({...currentDetail, videoThumbnail: auto});
                        }}
                        className="w-1/2 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        Miniature Auto
                      </button>
                    </div>
                  </div>

                  {/* Aperçu Miniature Vidéo */}
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700">Miniature Vidéo (Video Thumbnail)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={currentDetail.videoThumbnail || ''}
                      onChange={(e) => setCurrentDetail({...currentDetail, videoThumbnail: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                    />
                    {currentDetail.videoThumbnail && (
                      <div className="h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <img src={currentDetail.videoThumbnail} alt="Vidéo Thumbnail" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                      </div>
                    )}
                  </div>
                </div>

                {/* SCHÉMAS & DIAGRAMMES */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800">Schémas Scientifiques & Diagrammes ({currentDetail.diagrams?.length || 0})</label>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(currentDetail.diagrams || [])];
                        list.push({ image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800', caption: 'Légende du schéma' });
                        setCurrentDetail({...currentDetail, diagrams: list});
                      }}
                      className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-200"
                    >
                      + Ajouter un schéma
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {(currentDetail.diagrams || []).map((diag, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600">Schéma #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const list = currentDetail.diagrams.filter((_, i) => i !== idx);
                              setCurrentDetail({...currentDetail, diagrams: list});
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Supprimer
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={diag.image || ''}
                          onChange={(e) => {
                            const list = [...currentDetail.diagrams];
                            list[idx].image = e.target.value;
                            setCurrentDetail({...currentDetail, diagrams: list});
                          }}
                          className="w-full p-2 border border-gray-200 rounded text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Légende explicative"
                          value={diag.caption || ''}
                          onChange={(e) => {
                            const list = [...currentDetail.diagrams];
                            list[idx].caption = e.target.value;
                            setCurrentDetail({...currentDetail, diagrams: list});
                          }}
                          className="w-full p-2 border border-gray-200 rounded text-xs"
                        />
                        {diag.image && (
                          <div className="h-20 rounded overflow-hidden border border-gray-100">
                            <img src={diag.image} alt="Schéma" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* IMAGES LIÉES (RELATED IMAGES) */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800">Galerie d'Images Liées ({currentDetail.relatedImages?.length || 0})</label>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(currentDetail.relatedImages || [])];
                        list.push({ url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800' });
                        setCurrentDetail({...currentDetail, relatedImages: list});
                      }}
                      className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-200"
                    >
                      + Ajouter une image
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(currentDetail.relatedImages || []).map((rel, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-600">Image #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const list = currentDetail.relatedImages.filter((_, i) => i !== idx);
                              setCurrentDetail({...currentDetail, relatedImages: list});
                            }}
                            className="text-red-500 text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="URL"
                          value={rel.url || ''}
                          onChange={(e) => {
                            const list = [...currentDetail.relatedImages];
                            list[idx].url = e.target.value;
                            setCurrentDetail({...currentDetail, relatedImages: list});
                          }}
                          className="w-full p-1.5 border border-gray-200 rounded text-[11px]"
                        />
                        {rel.url && (
                          <div className="h-16 rounded overflow-hidden border border-gray-100">
                            <img src={rel.url} alt="Image liée" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIMELINE CHRONOLOGIQUE */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Étapes Chronologiques ({currentDetail.timeline?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(currentDetail.timeline || [])];
                        list.push({ period: '', event: '' });
                        setCurrentDetail({...currentDetail, timeline: list});
                      }}
                      className="px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-200"
                    >
                      + Ajouter une étape
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(currentDetail.timeline || []).map((t, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-gray-200">
                        <input
                          type="text"
                          placeholder="Période (ex: 1929)"
                          value={t.period || ''}
                          onChange={(e) => {
                            const list = [...currentDetail.timeline];
                            list[idx].period = e.target.value;
                            setCurrentDetail({...currentDetail, timeline: list});
                          }}
                          className="w-1/3 p-2 border border-gray-200 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Événement marquant"
                          value={t.event || ''}
                          onChange={(e) => {
                            const list = [...currentDetail.timeline];
                            list[idx].event = e.target.value;
                            setCurrentDetail({...currentDetail, timeline: list});
                          }}
                          className="flex-1 p-2 border border-gray-200 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = currentDetail.timeline.filter((_, i) => i !== idx);
                            setCurrentDetail({...currentDetail, timeline: list});
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHAMPS GÉNÉRAUX */}
              <div className="grid sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ID Découverte Liée</label>
                  <input
                    type="number"
                    required
                    value={currentDetail.id || ''}
                    onChange={(e) => setCurrentDetail({...currentDetail, id: Number(e.target.value)})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie / Discipline</label>
                  <input
                    type="text"
                    value={currentDetail.category || ''}
                    onChange={(e) => setCurrentDetail({...currentDetail, category: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Verset Coranique en Arabe</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={currentDetail.arabicVerse || ''}
                    onChange={(e) => setCurrentDetail({...currentDetail, arabicVerse: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-base font-arabic text-right"
                  />
                </div>
              </div>

              {/* ONGLETS DE LANGUE POUR LES TEXTES DÉTAILLÉS */}
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mr-2">Traductions :</span>

                  {[
                    { key: 'fr', label: '🇫🇷 Français' },
                    { key: 'ar', label: '🇸🇦 Arabe' },
                    { key: 'en', label: '🇬🇧 Anglais' },
                    { key: 'es', label: '🇪🇸 Espagnol' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setLangTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        langTab === tab.key 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Titre Détaillé ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        required
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDetail.translations?.[langTab]?.title || ''}
                        onChange={(e) => {
                          const updated = { ...currentDetail };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].title = e.target.value;
                          setCurrentDetail(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Référence Sourate ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDetail.translations?.[langTab]?.surahReference || ''}
                        onChange={(e) => {
                          const updated = { ...currentDetail };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].surahReference = e.target.value;
                          setCurrentDetail(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Traduction du Verset ({langTab.toUpperCase()})</label>
                    <textarea
                      rows="2"
                      dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                      value={currentDetail.translations?.[langTab]?.verseTranslation || ''}
                      onChange={(e) => {
                        const updated = { ...currentDetail };
                        if (!updated.translations[langTab]) updated.translations[langTab] = {};
                        updated.translations[langTab].verseTranslation = e.target.value;
                        setCurrentDetail(updated);
                      }}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Explication Scientifique Détaillée ({langTab.toUpperCase()})</label>
                    <textarea
                      rows="6"
                      required
                      dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                      value={currentDetail.translations?.[langTab]?.scientificExplanation || ''}
                      onChange={(e) => {
                        const updated = { ...currentDetail };
                        if (!updated.translations[langTab]) updated.translations[langTab] = {};
                        updated.translations[langTab].scientificExplanation = e.target.value;
                        setCurrentDetail(updated);
                      }}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm leading-relaxed"
                    ></textarea>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Commentaire du Verset ({langTab.toUpperCase()})</label>
                      <textarea
                        rows="3"
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDetail.translations?.[langTab]?.verseCommentary || ''}
                        onChange={(e) => {
                          const updated = { ...currentDetail };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].verseCommentary = e.target.value;
                          setCurrentDetail(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Contexte Historique ({langTab.toUpperCase()})</label>
                      <textarea
                        rows="3"
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentDetail.translations?.[langTab]?.historicalContext || ''}
                        onChange={(e) => {
                          const updated = { ...currentDetail };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].historicalContext = e.target.value;
                          setCurrentDetail(updated);
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white py-2">
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Enregistrer la Fiche Complète
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 4: CONTENU A LA UNE (FEATURED_CONTENT) */}
      {/* ------------------------------------------------------------------- */}
      {isFeaturedModalOpen && currentFeatured && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {featuredModalMode === 'add' ? 'Nouveau Contenu à la Une' : `Modifier Contenu #${currentFeatured.id}`}
              </h3>
              <button onClick={() => setIsFeaturedModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeatured} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Domaine</label>
                  <select
                    value={currentFeatured.domain || domains[0]?.nameFr}
                    onChange={(e) => {
                      const sel = domains.find(d => d.nameFr === e.target.value);
                      const updated = { ...currentFeatured, domain: e.target.value };
                      if (sel && updated.translations) {
                        if (updated.translations.fr) updated.translations.fr.domain = sel.nameFr;
                        if (updated.translations.ar) updated.translations.ar.domain = sel.nameAr;
                        if (updated.translations.en) updated.translations.en.domain = sel.nameEn;
                        if (updated.translations.es) updated.translations.es.domain = sel.nameEs;
                      }
                      setCurrentFeatured(updated);
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.nameFr || d.nameEn}>{d.nameFr || d.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Verset (ex: 51:47)</label>
                  <input
                    type="text"
                    value={currentFeatured.verse || ''}
                    onChange={(e) => setCurrentFeatured({...currentFeatured, verse: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={currentFeatured.imageUrl || ''}
                  onChange={(e) => setCurrentFeatured({...currentFeatured, imageUrl: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
                {currentFeatured.imageUrl && (
                  <div className="mt-2 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={currentFeatured.imageUrl} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Texte Coranique en Arabe</label>
                <textarea
                  rows="2"
                  dir="rtl"
                  value={currentFeatured.arabicText || ''}
                  onChange={(e) => setCurrentFeatured({...currentFeatured, arabicText: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-base font-arabic text-right"
                ></textarea>
              </div>

              {/* Onglets de Langue */}
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-3">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mr-2">Langue :</span>

                  {[
                    { key: 'fr', label: '🇫🇷 FR' },
                    { key: 'ar', label: '🇸🇦 AR' },
                    { key: 'en', label: '🇬🇧 EN' },
                    { key: 'es', label: '🇪🇸 ES' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setLangTab(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        langTab === tab.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Titre ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        required
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentFeatured.translations?.[langTab]?.title || ''}
                        onChange={(e) => {
                          const updated = { ...currentFeatured };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].title = e.target.value;
                          setCurrentFeatured(updated);
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nom Sourate ({langTab.toUpperCase()})</label>
                      <input
                        type="text"
                        dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                        value={currentFeatured.translations?.[langTab]?.surah || ''}
                        onChange={(e) => {
                          const updated = { ...currentFeatured };
                          if (!updated.translations[langTab]) updated.translations[langTab] = {};
                          updated.translations[langTab].surah = e.target.value;
                          setCurrentFeatured(updated);
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description ({langTab.toUpperCase()})</label>
                    <textarea
                      rows="3"
                      dir={langTab === 'ar' ? 'rtl' : 'ltr'}
                      value={currentFeatured.translations?.[langTab]?.description || ''}
                      onChange={(e) => {
                        const updated = { ...currentFeatured };
                        if (!updated.translations[langTab]) updated.translations[langTab] = {};
                        updated.translations[langTab].description = e.target.value;
                        setCurrentFeatured(updated);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsFeaturedModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 5: VIDEO / REEL */}
      {/* ------------------------------------------------------------------- */}
      {isVideoModalOpen && currentVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {videoModalMode === 'add' ? 'Nouveau Reel / Vidéo' : `Modifier Vidéo ${currentVideo.id}`}
              </h3>
              <button onClick={() => setIsVideoModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lien YouTube</label>
                <input
                  type="text"
                  required
                  placeholder="https://youtu.be/..."
                  value={currentVideo.videoUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    const autoThumb = getYouTubeThumbnail(url);
                    setCurrentVideo({
                      ...currentVideo,
                      videoUrl: url,
                      videoThumbnail: autoThumb || currentVideo.videoThumbnail
                    });
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">La miniature YouTube sera récupérée automatiquement.</p>
                {currentVideo.videoThumbnail && (
                  <div className="mt-2 h-28 rounded-lg overflow-hidden border border-gray-200 bg-black">
                    <img src={currentVideo.videoThumbnail} alt="Miniature YouTube" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Durée (ex: 4 minutes)</label>
                  <input
                    type="text"
                    value={currentVideo.videoDuration || ''}
                    onChange={(e) => setCurrentVideo({...currentVideo, videoDuration: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={currentVideo.category || 'tafsir_miracles'}
                    onChange={(e) => setCurrentVideo({...currentVideo, category: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Titre Vidéo (Français)</label>
                <input
                  type="text"
                  required
                  value={currentVideo.translations?.fr?.videoTitle || ''}
                  onChange={(e) => {
                    const updated = { ...currentVideo };
                    if (!updated.translations) updated.translations = {};
                    if (!updated.translations.fr) updated.translations.fr = {};
                    updated.translations.fr.videoTitle = e.target.value;
                    setCurrentVideo(updated);
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Titre Vidéo (Arabe)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={currentVideo.translations?.ar?.videoTitle || ''}
                  onChange={(e) => {
                    const updated = { ...currentVideo };
                    if (!updated.translations) updated.translations = {};
                    if (!updated.translations.ar) updated.translations.ar = {};
                    updated.translations.ar.videoTitle = e.target.value;
                    setCurrentVideo(updated);
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-arabic text-right"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsVideoModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 6: BASE HAFIZ IA */}
      {/* ------------------------------------------------------------------- */}
      {isKnowledgeModalOpen && currentKnowledge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 lg:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {knowledgeModalMode === 'add' ? 'Nouvelle Connaissance Hafiz IA' : `Modifier Connaissance`}
              </h3>
              <button onClick={() => setIsKnowledgeModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKnowledge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Question / Sujet / Mots-clés</label>
                <input
                  type="text"
                  required
                  placeholder="ex: expansion de l'univers"
                  value={currentKnowledge.query || ''}
                  onChange={(e) => setCurrentKnowledge({...currentKnowledge, query: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Réponse Théologique & Scientifique</label>
                <textarea
                  rows="5"
                  required
                  value={currentKnowledge.response || ''}
                  onChange={(e) => setCurrentKnowledge({...currentKnowledge, response: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Références (séparées par une virgule)</label>
                <input
                  type="text"
                  placeholder="Coran 51:47, Sahih Muslim..."
                  value={Array.isArray(currentKnowledge.references) ? currentKnowledge.references.join(', ') : ''}
                  onChange={(e) => setCurrentKnowledge({
                    ...currentKnowledge,
                    references: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Suggestions associées (séparées par une virgule)</label>
                <input
                  type="text"
                  placeholder="Astronomie, Big Bang..."
                  value={Array.isArray(currentKnowledge.suggestions) ? currentKnowledge.suggestions.join(', ') : ''}
                  onChange={(e) => setCurrentKnowledge({
                    ...currentKnowledge,
                    suggestions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsKnowledgeModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
