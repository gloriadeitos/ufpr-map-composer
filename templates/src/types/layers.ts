import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface PointStyle {
    geom: 'point';
    source: 'icon' | 'svg' | 'png';
    iconKey?: string;        // chave FA, ex: 'location-dot'
    color?: string;          // hex — cor do pino / tint SVG
    size: number;            // px tamanho base
    scaleZoom?: boolean;
    zoomBase?: number;
    minSize?: number;
    maxSize?: number;
    opacity: number;
    fileData?: string;       // base64 para svg/png upload
    fileName?: string;
}

export interface LineStyle {
    geom: 'line';
    color: string;
    width: number;
    dash: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
    opacity: number;
}

export interface PolygonStyle {
    geom: 'polygon';
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWidth: number;
    strokeDash: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
    strokeOpacity: number;
}

export interface RasterStyle {
    geom: 'raster';
    opacity: number;
}

export type LayerStyle = PointStyle | LineStyle | PolygonStyle | RasterStyle;

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
    style?: LayerStyle;
    fields?: { key: string; label: string; defaultHidden?: boolean }[];
}

export interface LayerDockItem extends LayerConfig {
    icon: IconDefinition;
    visible?: boolean;
}
