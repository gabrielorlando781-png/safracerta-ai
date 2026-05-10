// src/pages/Satellite.jsx
import React, { useState } from 'react';
import MapView from '../components/satellite/MapView';
import FieldDrawer from '../components/satellite/FieldDrawer';
import NdviOverlay from '../components/satellite/NdviOverlay';
import FieldStats from '../components/satellite/FieldStats';
import { useSatellite } from '../hooks/useSatellite';
import { Layers, Calendar, Map as MapIcon, Info, Trash2, Plus } from 'lucide-react';

const SatellitePage = () => {
    const [map, setMap] = useState(null);
    const { 
        fields, selectedField, setSelected, 
        activeIndex, setActiveIndex,
        overlayDate, setDate, 
        overlayOpacity, setOpacity,
        ndviData, saveField, deleteField 
    } = useSatellite();

    return (
        <div className="satellite-module" style={{ 
            display: 'flex', height: '100vh', width: '100vw', background: '#0a0a0a', overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Sidebar */}
            <div className="satellite-sidebar" style={{ 
                width: '380px', height: '100%', background: '#111', borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: '10px 0 30px rgba(0,0,0,0.5)'
            }}>
                <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ background: '#00ff88', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapIcon size={20} color="#000" />
                        </div>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Monitoramento</h2>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>Satélites Sentinel-2 & PlanetScope</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Search Location */}
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '10px' }}>Buscar Localização</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="Cidade, fazenda ou endereço..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // Trigger search logic on the map instance
                                        const query = e.target.value;
                                        if (query && map) {
                                            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.length > 0) {
                                                        const { lat, lon } = data[0];
                                                        map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 15 });
                                                    }
                                                });
                                        }
                                    }
                                }}
                                style={{ 
                                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '12px 15px', borderRadius: '10px', color: 'white', fontSize: '13px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Map Controls */}
                    <div style={{ padding: '20px' }}>
                        <h4 style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>Camadas de Satélite</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                            {['NDVI', 'NDWI', 'TRUE_COLOR', 'PLANET'].map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setActiveIndex(type)}
                                    style={{
                                        background: activeIndex === type ? '#00ff88' : 'rgba(255,255,255,0.05)',
                                        color: activeIndex === type ? '#000' : 'white',
                                        border: 'none', padding: '10px 5px', borderRadius: '8px', fontSize: '11px',
                                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {type === 'TRUE_COLOR' ? 'RGB' : type === 'PLANET' ? 'Alta Res' : type}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>
                                    <Calendar size={14} /> Data das Imagens
                                </label>
                                <input 
                                    type="date" 
                                    value={overlayDate}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', borderRadius: '8px', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>
                                    <span>Opacidade da Camada</span>
                                    <span>{Math.round(overlayOpacity * 100)}%</span>
                                </label>
                                <input 
                                    type="range" min="0" max="1" step="0.1" 
                                    value={overlayOpacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: '#00ff88' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Field List */}
                    <div style={{ padding: '0 20px 20px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>Meus Talhões</h4>
                            <span style={{ background: '#333', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>{fields.length}</span>
                        </div>
                        
                        <button 
                            onClick={() => {
                                // Trigger polygon tool on the map
                                if (map) {
                                    const drawControl = map._controls.find(c => c.changeMode);
                                    if (drawControl) drawControl.changeMode('draw_polygon');
                                }
                            }}
                            style={{
                                width: '100%', background: '#00ff88', color: '#000', border: 'none',
                                padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px',
                                marginBottom: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <Plus size={18} /> NOVO TALHÃO
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {fields.map(f => (
                                <div 
                                    key={f.id}
                                    onClick={() => setSelected(f)}
                                    style={{
                                        background: selectedField?.id === f.id ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${selectedField?.id === f.id ? '#00ff88' : 'rgba(255,255,255,0.05)'}`,
                                        padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '14px', marginBottom: '2px' }}>{f.name}</div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{f.cultura} • {f.area} ha</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #222', borderRadius: '16px' }}>
                                    <Plus size={32} color="#333" style={{ marginBottom: '10px' }} />
                                    <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Use o ícone de polígono no mapa para desenhar seu primeiro talhão.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <FieldStats field={selectedField} ndviData={ndviData} />
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                        <Info size={14} />
                        <span>Imagens atualizadas a cada 5 dias via Sentinel-2</span>
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div style={{ flex: 1, position: 'relative' }}>
                <MapView onMapLoad={setMap} />
                <FieldDrawer map={map} onFieldCreated={saveField} />
                <NdviOverlay 
                    map={map} 
                    activeIndex={activeIndex} 
                    overlayDate={overlayDate} 
                    overlayOpacity={overlayOpacity} 
                />
                
                {/* Visual Legend Overlay (Floating) */}
                <div style={{ 
                    position: 'absolute', bottom: '30px', left: '30px', 
                    background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                    zIndex: 10
                }}>
                    <h5 style={{ margin: '0 0 10px 0', color: 'white', fontSize: '12px' }}>Legenda NDVI</h5>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                        <div style={{ width: '12px', height: '12px', background: '#7f8c8d', borderRadius: '2px' }}></div> <span>Água</span>
                        <div style={{ width: '12px', height: '12px', background: '#ffd700', borderRadius: '2px' }}></div> <span>Solo</span>
                        <div style={{ width: '12px', height: '12px', background: '#00ff88', borderRadius: '2px' }}></div> <span>Saudável</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatellitePage;
