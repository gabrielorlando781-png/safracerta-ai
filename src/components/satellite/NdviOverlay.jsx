// src/components/satellite/NdviOverlay.jsx
import React, { useEffect } from 'react';
import { getSatelliteTileUrl } from '../../services/satellite';

const NdviOverlay = ({ map, activeIndex, overlayDate, overlayOpacity }) => {
    useEffect(() => {
        if (!map) return;

        const updateOverlay = async () => {
            const layerId = 'satellite-overlay';
            
            // Remove existing layer if any
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
                map.removeSource(layerId);
            }

            let tileUrl = '';
            
            if (activeIndex === 'PLANET') {
                const PLANET_API_KEY = import.meta.env.VITE_PLANET_API_KEY;
                if (!PLANET_API_KEY) return;
                
                // Using Planet Monthly Visual Mosaic (standard)
                // We'll try to guess the mosaic based on the date or use a recent one
                const date = new Date(overlayDate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const mosaicName = `global_monthly_${year}_${month}_visual`;
                
                tileUrl = `https://tiles.planet.com/basemaps/v1/planet-tiles/${mosaicName}/gmc/{z}/{x}/{y}.png?api_key=${PLANET_API_KEY}`;
            } else {
                const SENTINEL_INSTANCE_ID = import.meta.env.VITE_SENTINEL_INSTANCE_ID;
                if (!SENTINEL_INSTANCE_ID) return;
                
                tileUrl = `https://services.sentinel-hub.com/ogc/wms/${SENTINEL_INSTANCE_ID}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${activeIndex}&BBOX={bbox-epsg-3857}&TIME=${overlayDate}&FORMAT=image/png&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256`;
            }

            map.addSource(layerId, {
                type: 'raster',
                tiles: [tileUrl],
                tileSize: 256
            });

            map.addLayer({
                id: layerId,
                type: 'raster',
                source: layerId,
                paint: {
                    'raster-opacity': overlayOpacity
                }
            });
        };

        updateOverlay();
    }, [map, activeIndex, overlayDate, overlayOpacity]);

    return null; // This component logic only affects the map instance
};

export default NdviOverlay;
