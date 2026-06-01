import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface LayerConfig {
    id: string;
    label: string;
    file: string;
    color: string;
    geometryType?: 'polygon' | 'line' | 'point';
    type?: 'geojson' | 'raster' | 'tiles';
    url?: string;
    opacity?: number;
    tileUrl?: string;
    minZoom?: number;
    maxZoom?: number;
}

export interface LayerDockItem extends LayerConfig {
    icon: IconDefinition;
    visible?: boolean;
    fields?: { key: string; label: string }[];
}
