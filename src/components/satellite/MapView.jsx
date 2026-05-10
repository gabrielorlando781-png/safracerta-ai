// src/components/satellite/MapView.jsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapView = ({ onMapLoad }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
                version: 8,
                sources: {
                    'esri-satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 256,
                        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                    }
                },
                layers: [
                    {
                        id: 'esri-satellite',
                        type: 'raster',
                        source: 'esri-satellite',
                        layout: { visibility: 'visible' }
                    }
                ]
            },
            center: [-51.9253, -14.2350], // Center of Brazil
            zoom: 4,
            antialias: true
        });

        mapRef.current = map;

        map.on('load', () => {
            setIsLoaded(true);
            
            // Add navigation controls
            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Add geolocate control
            map.addControl(new maplibregl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: true
            }), 'top-right');

            // Add scale bar
            map.addControl(new maplibregl.ScaleControl());

            if (onMapLoad) onMapLoad(map);
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
            }
        };
    }, []);

    return (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', background: '#0a0a0a' }}>
            {!isLoaded && (
                <div className="map-loading-overlay" style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0a0a0a', color: '#00ff88', zIndex: 10
                }}>
                    <p>Carregando mapa gratuito...</p>
                </div>
            )}
        </div>
    );
};

export default MapView;
