import { useEffect, useState, useRef } from 'react';
import {
  MapPin, Loader2, GraduationCap, Store, Landmark, Bus, Stethoscope,
  UtensilsCrossed, Home, Ship, School, Building2,
} from 'lucide-react';

export interface SuggestedPlace {
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  category?: string;
  aliases?: string[];
  from?: 'reference' | 'live';
}

interface DestinationSearchProps {
  origin?: { latitude: number; longitude: number } | null;
  onSelect: (place: SuggestedPlace) => void;
}

// Coverage: Sekondi-Takoradi metro + Effia-Kwesimintsim + Shama + Ahanta West.
const BBOX = { minLon: -2.16, minLat: 4.60, maxLon: -1.30, maxLat: 5.20 };

const REFERENCE_POINTS: SuggestedPlace[] = [
  // ---------------------------------------------------------------- TOWNS & SUBURBS
  { name: 'Takoradi', fullAddress: 'Takoradi, Western Region, Ghana', latitude: 4.8874, longitude: -1.7519, category: 'town', aliases: ['takoradi'], from: 'reference' },
  { name: 'Sekondi', fullAddress: 'Sekondi-Takoradi, Western Region, Ghana', latitude: 4.9275, longitude: -1.7490, category: 'town', aliases: ['sekwondi', 'secondi'], from: 'reference' },
  { name: 'New Takoradi', fullAddress: 'New Takoradi, Sekondi-Takoradi, Ghana', latitude: 4.9067, longitude: -1.7454, category: 'town', aliases: ['new takoradi'], from: 'reference' },
  { name: 'Effiakuma', fullAddress: 'Effiakuma, Effia-Kwesimintsim, Takoradi', latitude: 4.9210, longitude: -1.7646, category: 'town', aliases: ['effiakuma', 'effia'], from: 'reference' },
  { name: 'Kwesimintsim', fullAddress: 'Kwesimintsim, Effia-Kwesimintsim, Takoradi', latitude: 4.9141, longitude: -1.7869, category: 'town', aliases: ['kwasimintsim', 'kwasimintsim', 'kwesi'], from: 'reference' },
  { name: 'Anaji', fullAddress: 'Anaji, Kwesimintsim, Takoradi', latitude: 4.9337, longitude: -1.7761, category: 'town', aliases: ['anaji'], from: 'reference' },
  { name: 'Tanokrom', fullAddress: 'Tanokrom, Kwesimintsim, Takoradi', latitude: 4.9112, longitude: -1.7671, category: 'town', aliases: ['tanokrom', 'tanokorom'], from: 'reference' },
  { name: 'Essipon', fullAddress: 'Essipon, Takoradi', latitude: 4.9140, longitude: -1.7950, category: 'town', aliases: ['essipun'], from: 'reference' },
  { name: 'Kojokrom', fullAddress: 'Kojokrom, Takoradi', latitude: 4.9160, longitude: -1.8050, category: 'town', aliases: ['kojokrom', 'kodjokrom'], from: 'reference' },
  { name: 'Essikado', fullAddress: 'Essikado, Sekondi-Takoradi', latitude: 4.9520, longitude: -1.7480, category: 'town', aliases: ['essikadu', 'essikado', 'essikado estate'], from: 'reference' },
  { name: 'Fijai', fullAddress: 'Fijai, Sekondi-Takoradi', latitude: 4.9391, longitude: -1.7547, category: 'town', aliases: ['fijai'], from: 'reference' },
  { name: 'Apowa', fullAddress: 'Apowa, Ahanta West, Western Region', latitude: 4.8949, longitude: -1.8175, category: 'town', aliases: ['apowa'], from: 'reference' },
  { name: 'Apremdo', fullAddress: 'Apremdo, Effia-Kwesimintsim, Takoradi', latitude: 4.9088, longitude: -1.7928, category: 'town', aliases: ['apremdo', 'apremdu'], from: 'reference' },
  { name: 'Inchaban', fullAddress: 'Inchaban, Shama District, Western Region', latitude: 4.9931, longitude: -1.6816, category: 'town', aliases: ['inchaban', 'enchaban'], from: 'reference' },
  { name: 'Nkotkompo', fullAddress: 'Nkotkompo, Takoradi', latitude: 4.8910, longitude: -1.7300, category: 'town', aliases: ['nkotompo', 'nkotkompo'], from: 'reference' },
  { name: 'Aboadze', fullAddress: 'Aboadze, Shama District, Western Region', latitude: 4.9727, longitude: -1.6501, category: 'town', aliases: ['aboadze'], from: 'reference' },
  { name: 'Abuesi', fullAddress: 'Abuesi, Shama District, Western Region', latitude: 4.9830, longitude: -1.6370, category: 'town', aliases: ['abuesi'], from: 'reference' },
  { name: 'Essaman', fullAddress: 'Essaman, Takoradi', latitude: 4.9190, longitude: -1.7990, category: 'town', aliases: ['essaman', 'esaman'], from: 'reference' },
  { name: 'Butumagyebu', fullAddress: 'Butumagyebu, Takoradi', latitude: 4.9160, longitude: -1.7720, category: 'town', aliases: ['butumagyebu', 'butumagaribu'], from: 'reference' },
  { name: 'Ngyresia', fullAddress: 'Ngyresia, Takoradi', latitude: 4.9370, longitude: -1.7550, category: 'town', aliases: ['ngyesia', 'nyresia'], from: 'reference' },
  { name: 'Adiembra', fullAddress: 'Adiembra, Sekondi-Takoradi', latitude: 4.9410, longitude: -1.7349, category: 'town', aliases: ['adiembra'], from: 'reference' },
  { name: 'Whindo', fullAddress: 'Whindo, Sekondi-Takoradi', latitude: 4.9150, longitude: -1.7450, category: 'town', aliases: ['whindo', 'windo'], from: 'reference' },
  { name: 'Sekondi New Town', fullAddress: 'Sekondi New Town, Sekondi', latitude: 4.9330, longitude: -1.7260, category: 'town', aliases: ['sekondi new town', 'new town'], from: 'reference' },
  { name: 'Tantrim', fullAddress: 'Tantrim, Sekondi-Takoradi', latitude: 4.9050, longitude: -1.7450, category: 'town', aliases: ['tantri', 'tantrim'], from: 'reference' },
  { name: 'Shama', fullAddress: 'Shama, Shama District, Western Region', latitude: 5.0103, longitude: -1.6290, category: 'town', aliases: ['shama', 'shamma', 'shama town'], from: 'reference' },
  { name: 'Shama Junction', fullAddress: 'Shama Junction, N1 Highway, Shama District', latitude: 5.0190, longitude: -1.6653, category: 'town', aliases: ['shama junction', 'shama junction'], from: 'reference' },
  { name: 'Anta East', fullAddress: 'Anta East, Shama District, Western Region', latitude: 5.0080, longitude: -1.6380, category: 'town', aliases: ['anta east', 'antha east'], from: 'reference' },
  { name: 'Daboase', fullAddress: 'Daboase, Shama District, Western Region', latitude: 5.0944, longitude: -1.6441, category: 'town', aliases: ['daboase'], from: 'reference' },
  { name: 'Axim', fullAddress: 'Axim, Nzema East, Western Region', latitude: 4.8654, longitude: -2.2422, category: 'town', aliases: ['axim'], from: 'reference' },
  { name: 'Busua', fullAddress: 'Busua, Ahanta West, Western Region', latitude: 4.8067, longitude: -1.9389, category: 'town', aliases: ['busua', 'busuah'], from: 'reference' },
  { name: 'Dixcove', fullAddress: 'Dixcove, Ahanta West, Western Region', latitude: 4.7948, longitude: -1.9464, category: 'town', aliases: ['dixcove', 'dixcove town'], from: 'reference' },
  { name: 'Agona Junction', fullAddress: 'Agona Junction, Ahanta West, Western Region', latitude: 4.8886, longitude: -1.9660, category: 'town', aliases: ['agona junction', 'agona'], from: 'reference' },
  { name: 'Cape Three Points', fullAddress: 'Cape Three Points, Ahanta West, Western Region', latitude: 4.7398, longitude: -2.0917, category: 'town', aliases: ['cape three points', 'three points'], from: 'reference' },
  { name: 'Fort Metal Cross', fullAddress: 'Fort Metal Cross, Dixcove', latitude: 4.7950, longitude: -1.9470, category: 'landmark', aliases: ['fort metal cross', 'metal cross'], from: 'reference' },
  { name: 'Akwidaa', fullAddress: 'Akwidaa, Ahanta West, Western Region', latitude: 4.7602, longitude: -2.0345, category: 'town', aliases: ['akwidaa', 'akwida'], from: 'reference' },
  { name: 'Princess Town', fullAddress: 'Princess Town, Ahanta West, Western Region', latitude: 4.8280, longitude: -1.8860, category: 'town', aliases: ['princess town', 'princess'], from: 'reference' },

  // ---------------------------------------------------------------- NEIGHBORHOODS
  { name: 'Chapel Hill', fullAddress: 'Chapel Hill, Takoradi', latitude: 4.8892, longitude: -1.7552, category: 'area', aliases: ['chapel hill'], from: 'reference' },
  { name: 'Dixcove Hill', fullAddress: 'Dixcove Hill, Takoradi', latitude: 4.8900, longitude: -1.7675, category: 'area', aliases: ['dixcove hill'], from: 'reference' },
  { name: 'Beach Road', fullAddress: 'Beach Road, Chapel Hill, Takoradi', latitude: 4.8778, longitude: -1.7587, category: 'area', aliases: ['beach road'], from: 'reference' },
  { name: 'Windy Ridge', fullAddress: 'Windy Ridge, Kwesimintsim, Takoradi', latitude: 4.9095, longitude: -1.7559, category: 'area', aliases: ['windy ridge'], from: 'reference' },
  { name: 'Airport Ridge', fullAddress: 'Airport Ridge, Takoradi', latitude: 4.9066, longitude: -1.7831, category: 'area', aliases: ['airport ridge'], from: 'reference' },
  { name: 'Amanful', fullAddress: 'Amanful, Chapel Hill, Takoradi', latitude: 4.8790, longitude: -1.7625, category: 'area', aliases: ['amanful'], from: 'reference' },
  { name: 'New Amanful', fullAddress: 'New Amanful, Ahanta West, Western Region', latitude: 4.8834, longitude: -1.7935, category: 'area', aliases: ['new amanful'], from: 'reference' },
  { name: 'Ketan', fullAddress: 'Ketan, Adiembra, Sekondi-Takoradi', latitude: 4.9510, longitude: -1.7288, category: 'area', aliases: ['ketan'], from: 'reference' },
  { name: 'Essixi', fullAddress: 'Essixi, Takoradi', latitude: 4.9000, longitude: -1.7700, category: 'area', aliases: ['essixi', 'esseksi'], from: 'reference' },
  { name: 'Mempeasem', fullAddress: 'Mempeasem, Takoradi', latitude: 4.8850, longitude: -1.7520, category: 'area', aliases: ['mempeasem'], from: 'reference' },
  { name: 'Coco Villa', fullAddress: 'Coco Villa, Effia-Kwesimintsim, Takoradi', latitude: 4.9110, longitude: -1.7480, category: 'area', aliases: ['coco villa'], from: 'reference' },
  { name: 'Polo Beach Estate', fullAddress: 'Polo Beach, Takoradi', latitude: 4.8700, longitude: -1.7550, category: 'area', aliases: ['polo beach', 'polo'], from: 'reference' },
  { name: 'Nkontompo Beach', fullAddress: 'Nkontompo Beach, Takoradi', latitude: 4.8850, longitude: -1.7350, category: 'area', aliases: ['nkotompo beach'], from: 'reference' },
  { name: 'Kokompe', fullAddress: 'Kokompe, Takoradi', latitude: 4.8930, longitude: -1.7630, category: 'area', aliases: ['kokompe'], from: 'reference' },

  // ---------------------------------------------------------------- MARKETS
  { name: 'Market Circle', fullAddress: 'Market Circle, Takoradi', latitude: 4.8972, longitude: -1.7608, category: 'market', aliases: ['market circle', 'takoradi market'], from: 'reference' },
  { name: 'Takoradi Central Market', fullAddress: 'Takoradi Central Market, Takoradi', latitude: 4.8982, longitude: -1.7613, category: 'market', aliases: ['central market', 'takoradi market'], from: 'reference' },
  { name: 'Effiakuma Market', fullAddress: 'Effiakuma Market, Takoradi', latitude: 4.9220, longitude: -1.7700, category: 'market', aliases: ['effiakuma market'], from: 'reference' },
  { name: 'Kojokrom Market', fullAddress: 'Kojokrom Market, Takoradi', latitude: 4.9170, longitude: -1.8090, category: 'market', aliases: ['kojokrom market'], from: 'reference' },
  { name: 'Apowa Market', fullAddress: 'Apowa Market, Ahanta West', latitude: 4.8970, longitude: -1.8220, category: 'market', aliases: ['apowa market'], from: 'reference' },
  { name: 'Sekondi Market', fullAddress: 'Market Street, Sekondi, Ghana', latitude: 4.9330, longitude: -1.7060, category: 'market', aliases: ['sekondi market', 'seki market'], from: 'reference' },
  { name: 'Shama Market', fullAddress: 'Shama Market, Shama', latitude: 5.0090, longitude: -1.6300, category: 'market', aliases: ['shama market'], from: 'reference' },

  // ---------------------------------------------------------------- SCHOOLS & CAMPUSES
  { name: 'Takoradi Technical University (TTU)', fullAddress: 'Windy Ridge, Takoradi', latitude: 4.9095, longitude: -1.7559, category: 'campus', aliases: ['ttu', 'takoradi technical university', 'tech'], from: 'reference' },
  { name: 'Takoradi Technical Institute (TTI)', fullAddress: 'Takoradi', latitude: 4.8920, longitude: -1.7440, category: 'campus', aliases: ['tti', 'takoradi technical institute'], from: 'reference' },
  { name: 'Ghana Secondary School (GHANASCO)', fullAddress: 'Gyandu, Sekondi', latitude: 4.9300, longitude: -1.7050, category: 'campus', aliases: ['ghanasco', 'ghana secondary school'], from: 'reference' },
  { name: 'Sekondi College', fullAddress: 'Sekondi', latitude: 4.9350, longitude: -1.7020, category: 'campus', aliases: ['sekondi college', 'seco'], from: 'reference' },
  { name: 'Archbishop Porter Girls SHS', fullAddress: 'Takoradi', latitude: 4.8935, longitude: -1.7430, category: 'campus', aliases: ['archbishop porter', 'porter girls', 'apgss'], from: 'reference' },
  { name: 'St. John\'s School, Sekondi', fullAddress: 'Sekondi', latitude: 4.9360, longitude: -1.7090, category: 'campus', aliases: ['st john', 'saint john sekondi'], from: 'reference' },
  { name: 'Takoradi Secondary School', fullAddress: 'Takoradi', latitude: 4.8950, longitude: -1.7510, category: 'campus', aliases: ['takoradi secondary', 'tako sec'], from: 'reference' },
  { name: 'Fijai Senior High School', fullAddress: 'Fijai, Takoradi', latitude: 4.9391, longitude: -1.7547, category: 'campus', aliases: ['fijai shs'], from: 'reference' },
  { name: 'Anaji Senior High School', fullAddress: 'Anaji, Takoradi', latitude: 4.9337, longitude: -1.7761, category: 'campus', aliases: ['anaji shs'], from: 'reference' },

  // ---------------------------------------------------------------- HOSPITALS & HEALTH
  { name: 'Effia-Nkwanta Regional Hospital', fullAddress: 'Effia-Nkwanta, Sekondi-Takoradi', latitude: 4.9114, longitude: -1.7131, category: 'medical', aliases: ['effia nkwanta', 'regional hospital', 'hospital'], from: 'reference' },
  { name: 'Takoradi Hospital', fullAddress: 'Chapel Hill, Takoradi', latitude: 4.8863, longitude: -1.7525, category: 'medical', aliases: ['takoradi hospital', 'hospital'], from: 'reference' },
  { name: 'Sekondi Government Hospital', fullAddress: 'Sekondi', latitude: 4.9300, longitude: -1.7110, category: 'medical', aliases: ['sekondi hospital'], from: 'reference' },
  { name: 'International Maritime Hospital (IMaH)', fullAddress: 'Chapel Hill, Takoradi', latitude: 4.8830, longitude: -1.7530, category: 'medical', aliases: ['imah', 'maritime hospital'], from: 'reference' },
  { name: 'Takoradi Medical Centre', fullAddress: 'Takoradi', latitude: 4.8890, longitude: -1.7580, category: 'medical', aliases: ['medical centre'], from: 'reference' },
  { name: 'Apollo Clinic & Maternity', fullAddress: 'Takoradi', latitude: 4.8940, longitude: -1.7620, category: 'medical', aliases: ['apollo clinic'], from: 'reference' },

  // ---------------------------------------------------------------- BANKS
  { name: 'GCB Bank — Harbour Road', fullAddress: 'Harbour Road, Takoradi, Ghana', latitude: 4.8897, longitude: -1.7535, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank', 'harbour road'], from: 'reference' },
  { name: 'GCB Bank — Market Circle', fullAddress: 'Market Circle, Takoradi, Ghana', latitude: 4.8958, longitude: -1.7602, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank'], from: 'reference' },
  { name: 'GCB Bank — Secondary School Road', fullAddress: 'Secondary School Road, Sekondi, Ghana', latitude: 4.9310, longitude: -1.7140, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank'], from: 'reference' },
  { name: 'GCB Bank — Shama', fullAddress: 'Shama, Western Region', latitude: 5.0103, longitude: -1.6330, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank'], from: 'reference' },
  { name: 'GCB Bank — Sekondi', fullAddress: 'Market Street, Sekondi, Ghana', latitude: 4.9342, longitude: -1.7070, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank'], from: 'reference' },
  { name: 'GCB Bank — Harbour Business Area', fullAddress: 'Harbour Business Area, Takoradi', latitude: 4.8870, longitude: -1.7500, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank', 'harbour business area'], from: 'reference' },
  { name: 'GCB Bank — Effiakuma', fullAddress: 'Effiakuma, Takoradi', latitude: 4.9220, longitude: -1.7710, category: 'bank', aliases: ['carbank', 'gcb', 'gcb bank'], from: 'reference' },
  { name: 'ECOBANK — Takoradi', fullAddress: 'Market Circle, Takoradi', latitude: 4.8960, longitude: -1.7598, category: 'bank', aliases: ['ecobank', 'eco bank'], from: 'reference' },
  { name: 'Stanbic Bank — Takoradi', fullAddress: 'Liberation Road, Takoradi', latitude: 4.9080, longitude: -1.7450, category: 'bank', aliases: ['stanbic'], from: 'reference' },
  { name: 'Absa Bank — Takoradi', fullAddress: 'Market Circle, Takoradi', latitude: 4.8954, longitude: -1.7594, category: 'bank', aliases: ['absa', 'barclays'], from: 'reference' },
  { name: 'Zenith Bank — Takoradi', fullAddress: 'Takoradi', latitude: 4.8930, longitude: -1.7580, category: 'bank', aliases: ['zenith'], from: 'reference' },
  { name: 'Fidelity Bank — Takoradi', fullAddress: 'Takoradi', latitude: 4.8900, longitude: -1.7560, category: 'bank', aliases: ['fidelity'], from: 'reference' },

  // ---------------------------------------------------------------- LANDMARKS & TRANSPORT
  { name: 'Takoradi Harbour (GPHA)', fullAddress: 'Harbour, Takoradi', latitude: 4.8958, longitude: -1.7622, category: 'landmark', aliases: ['harbour', 'gpha', 'takoradi harbour', 'harbor'], from: 'reference' },
  { name: 'Takoradi Airport', fullAddress: 'Kwame Nkrumah Boulevard, Takoradi', latitude: 4.8958, longitude: -1.7737, category: 'transport', aliases: ['airport', 'takoradi airport', 'tako airport'], from: 'reference' },
  { name: 'Takoradi Naval Base', fullAddress: 'Chapel Hill, Takoradi', latitude: 4.8960, longitude: -1.7510, category: 'landmark', aliases: ['navy', 'naval base'], from: 'reference' },
  { name: 'Takoradi Railway Station', fullAddress: 'Harbour Area, Takoradi', latitude: 4.8890, longitude: -1.7510, category: 'transport', aliases: ['train station', 'railway'], from: 'reference' },
  { name: 'Ghana Cocoa Board (COCOBOD)', fullAddress: 'Kejebril, Takoradi', latitude: 4.9210, longitude: -1.7150, category: 'landmark', aliases: ['cocoa board', 'cocobod', 'cocoa board takoradi'], from: 'reference' },
  { name: 'Energy Bank Takoradi', fullAddress: 'Farouq Building, near SNNIT, Takoradi', latitude: 4.8920, longitude: -1.7540, category: 'landmark', aliases: ['energy bank'], from: 'reference' },
  { name: 'SNNIT Office Takoradi', fullAddress: 'Takoradi', latitude: 4.8915, longitude: -1.7530, category: 'landmark', aliases: ['snnit', 'social security'], from: 'reference' },
  { name: 'Ghana Post — Takoradi', fullAddress: 'Axim Road, Takoradi', latitude: 4.8955, longitude: -1.7642, category: 'landmark', aliases: ['post office', 'ghana post'], from: 'reference' },
  { name: 'Sekondi High Court', fullAddress: 'High Court Avenue, Sekondi', latitude: 4.9317, longitude: -1.7369, category: 'landmark', aliases: ['high court', 'court', 'sekondi court'], from: 'reference' },
  { name: 'Takoradi Golf Course', fullAddress: 'Eighteen Square, Takoradi', latitude: 4.8880, longitude: -1.7560, category: 'landmark', aliases: ['golf course', 'golf'], from: 'reference' },
  { name: 'Takoradi Mall', fullAddress: 'Liberation Road, Takoradi', latitude: 4.9090, longitude: -1.7440, category: 'shopping', aliases: ['takoradi mall', 'mall'], from: 'reference' },
  { name: 'Takoradi STC / Metro Mass Station', fullAddress: 'Takoradi', latitude: 4.8900, longitude: -1.7610, category: 'transport', aliases: ['bus station', 'stc', 'metro mass', 'lorry station'], from: 'reference' },
  { name: 'Tnako Lorry Station', fullAddress: 'Takoradi bus terminal, Market Circle', latitude: 4.8950, longitude: -1.7610, category: 'transport', aliases: ['lorry station', 'bus station', 'tnako'], from: 'reference' },
  { name: 'Sekondi Central Police Station', fullAddress: 'Sekondi', latitude: 4.9330, longitude: -1.7040, category: 'landmark', aliases: ['police station', 'police'], from: 'reference' },

  // ---------------------------------------------------------------- RESTAURANTS & HOTELS
  { name: 'Chicken Inn Takoradi', fullAddress: 'Market Circle, Takoradi', latitude: 4.8952, longitude: -1.7600, category: 'restaurant', aliases: ['chicken inn'], from: 'reference' },
  { name: 'Papaye Takoradi', fullAddress: 'Market Circle, Takoradi', latitude: 4.8955, longitude: -1.7596, category: 'restaurant', aliases: ['papaye'], from: 'reference' },
  { name: 'KFC Takoradi', fullAddress: 'Axim Road, Takoradi', latitude: 4.8940, longitude: -1.7560, category: 'restaurant', aliases: ['kfc'], from: 'reference' },
  { name: 'Best Western Plus Takoradi', fullAddress: 'Takoradi', latitude: 4.8860, longitude: -1.7590, category: 'restaurant', aliases: ['best western', 'hotel'], from: 'reference' },
  { name: 'Atlantic Hotel Takoradi', fullAddress: 'Takoradi', latitude: 4.8930, longitude: -1.7590, category: 'restaurant', aliases: ['atlantic hotel'], from: 'reference' },
  { name: 'Hilltop Hotel Takoradi', fullAddress: 'Airport Ridge, Takoradi', latitude: 4.9060, longitude: -1.7790, category: 'restaurant', aliases: ['hilltop hotel'], from: 'reference' },
  { name: 'Charlie Sands Beach', fullAddress: 'Butre, Ahanta West', latitude: 4.8170, longitude: -1.9200, category: 'area', aliases: ['charlie sands', 'beach'], from: 'reference' },
  { name: 'Selende Events Centre', fullAddress: 'Shama, Western Region', latitude: 5.0120, longitude: -1.6400, category: 'landmark', aliases: ['selende event', 'selendes', 'event centre'], from: 'reference' },
];

const categoryMeta: Record<string, { label: string; icon: any }> = {
  town: { label: 'Town', icon: Home },
  market: { label: 'Market', icon: Store },
  campus: { label: 'School / Campus', icon: GraduationCap },
  school: { label: 'School', icon: School },
  landmark: { label: 'Landmark', icon: Landmark },
  transport: { label: 'Station / Terminal', icon: Bus },
  medical: { label: 'Hospital / Clinic', icon: Stethoscope },
  restaurant: { label: 'Restaurant / Hotel', icon: UtensilsCrossed },
  shopping: { label: 'Shopping', icon: Store },
  area: { label: 'Neighborhood', icon: MapPin },
  bank: { label: 'Bank', icon: Building2 },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number | null {
  if (![lat1, lng1, lat2, lng2].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function liveSearch(query: string): Promise<SuggestedPlace[]> {
  try {
    const { minLon, minLat, maxLon, maxLat } = BBOX;
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=gh&limit=10&addressdetails=1` +
      `&bounded=1&viewbox=${minLon},${minLat},${maxLon},${maxLat}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('bad status');
    const data = (await res.json()) as { display_name: string; lat: string; lon: string; type?: string }[];
    return data
      .filter(d => {
        const lat = parseFloat(d.lat);
        const lon = parseFloat(d.lon);
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
      })
      .map(d => ({
        name: d.display_name.split(',')[0],
        fullAddress: d.display_name,
        latitude: parseFloat(d.lat),
        longitude: parseFloat(d.lon),
        category: d.type === 'city' || d.type === 'town' || d.type === 'village' ? 'town' : 'area',
        from: 'live' as const,
      }));
  } catch {
    return [];
  }
}

// Rank: exact match / prefix first, then token-any match, then alias.
function rankPlaces(query: string, places: SuggestedPlace[]): SuggestedPlace[] {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter(t => t.length >= 1);

  const scored = places.map(p => {
    const name = p.name.toLowerCase();
    const hay = `${name} ${p.fullAddress.toLowerCase()} ${(p.aliases || []).join(' ').toLowerCase()}`;
    let score = -1;

    const exactName = name === q;
    const startsWith = name.startsWith(q) || (p.aliases || []).some(a => a.toLowerCase().startsWith(q));
    const nameContains = name.includes(q);
    const aliasContains = (p.aliases || []).some(a => a.toLowerCase().includes(q));
    const allTokensFound = tokens.length > 0 && tokens.every(t => hay.includes(t));

    if (exactName) score = 1000;
    else if (startsWith) score = 600;
    else if (nameContains) score = 400;
    else if (allTokensFound) score = 200 + tokens.length * 5;
    else if (aliasContains) score = 80;
    else if (tokens.length === 1 && hay.includes(q)) score = 50;
    else if (tokens.some(t => hay.includes(t))) score = 30;

    return { p, score };
  });

  return scored
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.p);
}

export function DestinationSearch({ origin, onSelect }: DestinationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Live search-as-you-type, Bolt-style. No search button needed.
  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (q.length === 0) {
      setLoading(false);
      setSuggestions(REFERENCE_POINTS);
      return;
    }

    // Rank curated matches locally first (fast, always reliable).
    const localMatches = rankPlaces(query, REFERENCE_POINTS);

    setLoading(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const live = await liveSearch(query.trim());
      const liveRanked = rankPlaces(
        query,
        live.filter(l => !localMatches.some(p => p.name.toLowerCase() === l.name.toLowerCase()))
      );
      setSuggestions([...localMatches, ...liveRanked]);
      setLoading(false);
    }, 250);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (p: SuggestedPlace) => {
    setQuery(p.name);
    setOpen(false);
    onSelect(p);
  };

  const visible = (open ? suggestions : []).slice(0, 12);

  return (
    <div ref={boxRef} className="relative space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none p-2 pl-4">
        <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search any place — e.g. Coco Villa, carbank, TTU, Market Circle…"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(true); }}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {loading && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
      </div>

      {visible.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto">
          {visible.map((s, i) => {
            const km = origin ? haversineKm(origin.latitude, origin.longitude, s.latitude, s.longitude) : null;
            const meta = s.category ? categoryMeta[s.category] : null;
            const Icon = meta?.icon || MapPin;
            return (
              <button
                key={`${s.name}-${s.latitude}-${s.longitude}-${i}`}
                type="button"
                onClick={() => choose(s)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0"
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</span>
                    {meta && (
                      <span className="shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                        {meta.label}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 truncate">{s.fullAddress}</span>
                </span>
                {km != null && (
                  <span className="shrink-0 text-xs font-black text-emerald-600 whitespace-nowrap">
                    {km < 10 ? km.toFixed(1) : Math.round(km)} km
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {open && !loading && visible.length === 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl px-4 py-3 text-sm text-gray-500 dark:text-slate-400 font-semibold">
          No match yet — keep typing or try a shorter word (e.g. "market", "bank", "junction").
        </div>
      )}
    </div>
  );
}