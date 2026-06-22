import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface LayerConfig {
    id: string;
    label: string;
    file: string;
    color: string;
    geometryType?: 'polygon' | 'line' | 'point';
    type?: 'geojson' | 'raster' | 'tiles' | 'arcgis';
    url?: string;
    opacity?: number;
    tileUrl?: string;
    arcgisUrl?: string;
    arcgisLayerId?: number;
    minZoom?: number;
    maxZoom?: number;
    downloadOnly?: boolean;
    compareOnly?: boolean;
    extraDownloads?: { label: string; file: string }[];
    strokeColor?: string;
    strokeWidth?: number;
    clipToStudyArea?: boolean;
}

export interface LayerDockItem extends LayerConfig {
    icon: IconDefinition;
    visible?: boolean;
    fields?: { key: string; label: string }[];
}
