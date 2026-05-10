// src/components/satellite/FieldStats.jsx
import React from 'react';
import { classifyNdvi } from '../../services/satellite';

const FieldStats = ({ field, ndviData }) => {
    if (!field) return null;

    const classification = classifyNdvi(ndviData.avg);

    const exportKml = () => {
        const coords = field.geometry.coordinates[0].map(c => `${c[0]},${c[1]},0`).join(' ');
        const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>${field.name}</name>
    <Polygon>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>${coords}</coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>
</kml>`;
        downloadFile(kml, `${field.name}.kml`, 'application/vnd.google-earth.kml+xml');
    };

    const exportGeoJson = () => {
        downloadFile(JSON.stringify(field, null, 2), `${field.name}.geojson`, 'application/json');
    };

    const downloadFile = (content, fileName, contentType) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    };

    return (
        <div className="field-stats-panel" style={{ padding: '20px', color: 'white', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', textTransform: 'uppercase', color: '#00ff88', letterSpacing: '1px' }}>Análise do Talhão</h4>
            
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{field.name}</h3>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>Cultura: {field.cultura}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px' }}>
                    <span style={{ display: 'block', fontSize: '11px', opacity: 0.5, marginBottom: '5px' }}>ÁREA</span>
                    <strong style={{ fontSize: '16px' }}>{field.area} ha</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px' }}>
                    <span style={{ display: 'block', fontSize: '11px', opacity: 0.5, marginBottom: '5px' }}>SAÚDE</span>
                    <strong style={{ fontSize: '16px', color: classification.color }}>{Math.round(ndviData.avg * 100)}%</strong>
                </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span>Índice NDVI</span>
                    <span style={{ color: classification.color, fontWeight: 'bold' }}>{classification.label}</span>
                </div>
                <div style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${ndviData.avg * 100}%`, background: classification.color, borderRadius: '4px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>
                    <span>0.0</span>
                    <span>0.5</span>
                    <span>1.0</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={exportKml} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>↓ EXPORTAR KML</span>
                </button>
                <button onClick={exportGeoJson} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>↓ EXPORTAR GeoJSON</span>
                </button>
            </div>
        </div>
    );
};

export default FieldStats;
