// src/hooks/useSatellite.js
import { useState, useEffect } from 'react';
import * as turf from '@turf/turf';

/**
 * Hook to manage satellite field data, overlays, and selection
 */
export function useSatellite() {
    const [fields, setFields] = useState(() => {
        const saved = localStorage.getItem('safracerta_fields');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [selectedField, setSelected] = useState(null);
    const [activeIndex, setActiveIndex] = useState('NDVI'); // NDVI | NDWI | RGB
    const [overlayDate, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [overlayOpacity, setOpacity] = useState(0.7);
    const [ndviData, setNdviData] = useState({
        min: 0.31,
        avg: 0.62,
        max: 0.81
    });

    /**
     * Save a new field polygon
     */
    function saveField(polygon, name, cultura) {
        const area = turf.area(polygon) / 10000; // m² to ha
        const field = {
            id: crypto.randomUUID(),
            name,
            cultura,
            area: parseFloat(area.toFixed(2)),
            geometry: polygon,
            createdAt: new Date().toISOString()
        };
        
        const updated = [...fields, field];
        setFields(updated);
        localStorage.setItem('safracerta_fields', JSON.stringify(updated));
        return field;
    }

    /**
     * Delete a field by ID
     */
    function deleteField(id) {
        const updated = fields.filter(f => f.id !== id);
        setFields(updated);
        localStorage.setItem('safracerta_fields', JSON.stringify(updated));
        if (selectedField?.id === id) setSelected(null);
    }

    return { 
        fields, 
        selectedField, 
        setSelected, 
        activeIndex, 
        setActiveIndex,
        overlayDate, 
        setDate, 
        overlayOpacity, 
        setOpacity,
        ndviData, 
        saveField, 
        deleteField 
    };
}
