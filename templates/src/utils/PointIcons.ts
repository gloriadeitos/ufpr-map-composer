/**
 * PointIcons.ts
 * Mapa de chaves FA (kebab-case) para IconDefinition e funções de renderização
 * de pino SVG para uso com ol/style/Icon.
 */
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faLocationDot, faMapPin, faMapMarkerAlt,
    faStar, faFlag, faCrosshairs, faCompass, faCircle, faCircleDot, faSignsPost,
    faCar, faBus, faBicycle, faMotorcycle, faTruck, faTrain, faPlane, faHelicopter,
    faShip, faTaxi, faGasPump, faParking, faTrafficLight, faRoad, faRoute,
    faTruckMedical, faPersonBiking, faPersonHiking, faPlug,
    faHospital, faHouseMedical, faPills, faHeartPulse, faSyringe, faStethoscope,
    faWheelchair, faCross, faKitMedical, faPersonCane,
    faSchool, faBuildingColumns, faGraduationCap, faChalkboardUser, faMicroscope,
    faBookOpen, faPencil, faBook,
    faUtensils, faMugHot, faStore, faCartShopping, faBed, faLandmark, faEnvelope,
    faScissors, faWrench, faCity, faBuilding, faIndustry, faWarehouse,
    faShieldHalved, faFireExtinguisher, faLifeRing, faTriangleExclamation,
    faBell, faPersonShelter, faVault,
    faFutbol, faDumbbell, faMasksTheater, faCamera, faPersonSwimming, faMountainSun,
    faTree, faMusic, faPanorama,
    faChurch, faPlaceOfWorship, faChessRook,
    faBolt, faDroplet, faTowerBroadcast, faSolarPanel, faRecycle, faWater,
    faLeaf, faFire, faSatellite,
    faCircleExclamation, faCircleInfo, faCircleQuestion, faBan, faCircleCheck,
    faArrowUp, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

// ─────────────────────────────────────────────────────────────────────────────
// Mapa completo: kebab-key → IconDefinition
// ─────────────────────────────────────────────────────────────────────────────
export const POINT_ICONS: Record<string, IconDefinition> = {
    'location-dot': faLocationDot,
    'map-pin': faMapPin,
    'map-marker-alt': faMapMarkerAlt,
    'star': faStar,
    'flag': faFlag,
    'crosshairs': faCrosshairs,
    'compass': faCompass,
    'circle': faCircle,
    'circle-dot': faCircleDot,
    'signs-post': faSignsPost,
    'car': faCar,
    'bus': faBus,
    'bicycle': faBicycle,
    'motorcycle': faMotorcycle,
    'truck': faTruck,
    'train': faTrain,
    'plane': faPlane,
    'helicopter': faHelicopter,
    'ship': faShip,
    'taxi': faTaxi,
    'gas-pump': faGasPump,
    'parking': faParking,
    'traffic-light': faTrafficLight,
    'road': faRoad,
    'route': faRoute,
    'truck-medical': faTruckMedical,
    'person-biking': faPersonBiking,
    'person-hiking': faPersonHiking,
    'plug': faPlug,
    'hospital': faHospital,
    'house-medical': faHouseMedical,
    'pills': faPills,
    'heart-pulse': faHeartPulse,
    'syringe': faSyringe,
    'stethoscope': faStethoscope,
    'wheelchair': faWheelchair,
    'cross': faCross,
    'kit-medical': faKitMedical,
    'person-cane': faPersonCane,
    'school': faSchool,
    'building-columns': faBuildingColumns,
    'graduation-cap': faGraduationCap,
    'chalkboard-user': faChalkboardUser,
    'microscope': faMicroscope,
    'book-open': faBookOpen,
    'pencil': faPencil,
    'book': faBook,
    'utensils': faUtensils,
    'mug-hot': faMugHot,
    'store': faStore,
    'cart-shopping': faCartShopping,
    'bed': faBed,
    'landmark': faLandmark,
    'envelope': faEnvelope,
    'scissors': faScissors,
    'wrench': faWrench,
    'city': faCity,
    'building': faBuilding,
    'industry': faIndustry,
    'warehouse': faWarehouse,
    'shield-halved': faShieldHalved,
    'fire-extinguisher': faFireExtinguisher,
    'life-ring': faLifeRing,
    'triangle-exclamation': faTriangleExclamation,
    'bell': faBell,
    'person-shelter': faPersonShelter,
    'vault': faVault,
    'futbol': faFutbol,
    'dumbbell': faDumbbell,
    'masks-theater': faMasksTheater,
    'camera': faCamera,
    'person-swimming': faPersonSwimming,
    'mountain-sun': faMountainSun,
    'tree': faTree,
    'music': faMusic,
    'panorama': faPanorama,
    'church': faChurch,
    'place-of-worship': faPlaceOfWorship,
    'chess-rook': faChessRook,
    'bolt': faBolt,
    'droplet': faDroplet,
    'tower-broadcast': faTowerBroadcast,
    'solar-panel': faSolarPanel,
    'recycle': faRecycle,
    'water': faWater,
    'leaf': faLeaf,
    'fire': faFire,
    'satellite': faSatellite,
    'circle-exclamation': faCircleExclamation,
    'circle-info': faCircleInfo,
    'circle-question': faCircleQuestion,
    'ban': faBan,
    'circle-check': faCircleCheck,
    'arrow-up': faArrowUp,
    'arrow-right': faArrowRight,
};

// ─────────────────────────────────────────────────────────────────────────────
// Gerador de pino SVG (teardrop com ícone FA branco dentro)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera um SVG de pino estilo teardrop com o ícone FontAwesome dentro.
 * @param bgColor  Cor de fundo do pino (hex ou qualquer valor CSS)
 * @param iconDef  IconDefinition do FontAwesome (opcional — pino vazio se ausente)
 * @param size     Tamanho do viewBox do pino (padrão 40×50)
 */
function _makePinSvg(bgColor: string, iconDef?: IconDefinition): string {
    const pinPath =
        'M20 2 C10.1 2 2 10.1 2 20 C2 32 20 50 20 50 C20 50 38 32 38 20 C38 10.1 29.9 2 20 2 Z';

    let iconSvg = '';
    if (iconDef) {
        const raw = iconDef.icon;
        const w = raw[0] as number;
        const h = raw[1] as number;
        const pathData = Array.isArray(raw[4]) ? (raw[4] as string[]).join(' ') : (raw[4] as string);
        // Ícone posicionado centralizado no topo do pino (área ciruclar ~y 2-38)
        iconSvg = `<svg x="8" y="6" width="24" height="24" viewBox="0 0 ${w} ${h}">
      <path d="${pathData}" fill="white"/>
    </svg>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="40" height="50">
  <path d="${pinPath}" fill="${bgColor}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
  ${iconSvg}
</svg>`;
}

/**
 * Gera uma data URL SVG de pino para uso em ol/style/Icon.
 * @param iconKey  Chave kebab-case do catálogo (ex: 'location-dot')
 * @param color    Cor do pino
 * @param _size    Ignorado internamente — o tamanho é controlado pelo scale do ol/style/Icon
 */
export function makePointMarkerUrl(iconKey: string, color: string, _size = 28): string {
    const iconDef = POINT_ICONS[iconKey];
    const svg = _makePinSvg(color, iconDef);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Gera data URL de pino simples (sem ícone) para fontes externas (png/svg upload)
 * onde a imagem é carregada separadamente.
 */
export function makePlainPinUrl(color: string): string {
    const svg = _makePinSvg(color, undefined);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
