// src/components/satellite/FieldDrawer.jsx
import React, { useEffect, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

const FieldDrawer = ({ map, onFieldCreated, onCancel }) => {
    const [drawInstance, setDrawInstance] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [tempPolygon, setTempPolygon] = useState(null);
    const [fieldName, setFieldName] = useState('');
    const [fieldCultura, setFieldCultura] = useState('Soja');

    useEffect(() => {
        if (!map) return;

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            styles: [
                {
                    id: 'gl-draw-polygon-fill',
                    type: 'fill',
                    filter: ['all', ['==', '$type', 'Polygon']],
                    paint: {
                        'fill-color': '#00ff88',
                        'fill-opacity': 0.15
                    }
                },
                {
                    id: 'gl-draw-polygon-stroke',
                    type: 'line',
                    filter: ['all', ['==', '$type', 'Polygon']],
                    paint: {
                        'line-color': '#00ff88',
                        'line-width': 2
                    }
                },
                {
                    id: 'gl-draw-point',
                    type: 'circle',
                    filter: ['all', ['==', '$type', 'Point']],
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#00ff88'
                    }
                }
            ]
        });

        map.addControl(draw, 'top-left');
        setDrawInstance(draw);

        const handleDrawCreate = (e) => {
            const polygon = e.features[0];
            setTempPolygon(polygon);
            setShowSaveModal(true);
        };

        map.on('draw.create', handleDrawCreate);

        return () => {
            map.removeControl(draw);
            map.off('draw.create', handleDrawCreate);
        };
    }, [map]);

    const handleSave = () => {
        if (!tempPolygon || !fieldName) return;
        
        onFieldCreated(tempPolygon, fieldName, fieldCultura);
        
        // Reset
        drawInstance.deleteAll();
        setShowSaveModal(false);
        setFieldName('');
        setTempPolygon(null);
    };

    const handleCancel = () => {
        drawInstance.deleteAll();
        setShowSaveModal(false);
        setFieldName('');
        setTempPolygon(null);
    };

    const calculatedArea = tempPolygon ? (turf.area(tempPolygon) / 10000).toFixed(2) : 0;

    return (
        <>
            {showSaveModal && (
                <div className="save-modal-overlay" style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: '#1a1a1a', padding: '25px', borderRadius: '16px', zIndex: 2000,
                    width: '320px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    color: 'white'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#00ff88' }}>Novo Talhão</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>Nome do Talhão</label>
                        <input 
                            type="text" 
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            placeholder="Ex: Talhão Norte"
                            style={{ width: '100%', background: '#333', border: 'none', padding: '10px', borderRadius: '8px', color: 'white' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>Cultura</label>
                        <select 
                            value={fieldCultura}
                            onChange={(e) => setFieldCultura(e.target.value)}
                            style={{ width: '100%', background: '#333', border: 'none', padding: '10px', borderRadius: '8px', color: 'white' }}
                        >
                            <option>Soja</option>
                            <option>Milho</option>
                            <option>Trigo</option>
                            <option>Algodão</option>
                        </select>
                    </div>

                    <div style={{ background: 'rgba(0,255,136,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>Área Calculada: </span>
                        <strong style={{ color: '#00ff88' }}>{calculatedArea} ha</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #444', padding: '10px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>CANCELAR</button>
                        <button onClick={handleSave} style={{ flex: 1, background: '#00ff88', border: 'none', padding: '10px', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>SALVAR</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FieldDrawer;
