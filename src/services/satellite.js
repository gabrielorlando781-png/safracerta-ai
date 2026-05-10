// src/services/satellite.js

const SENTINEL_INSTANCE_ID = import.meta.env.VITE_SENTINEL_INSTANCE_ID;
const SENTINEL_CLIENT_ID   = import.meta.env.VITE_SENTINEL_CLIENT_ID;
const SENTINEL_CLIENT_SECRET = import.meta.env.VITE_SENTINEL_CLIENT_SECRET;

/**
 * Get an OAuth2 token from Sentinel Hub
 */
async function getSentinelToken() {
    if (!SENTINEL_CLIENT_ID || !SENTINEL_CLIENT_SECRET) {
        throw new Error("Sentinel Hub credentials missing");
    }

    const res = await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${SENTINEL_CLIENT_ID}&client_secret=${SENTINEL_CLIENT_SECRET}`
    });
    
    if (!res.ok) throw new Error("Failed to authenticate with Sentinel Hub");
    const data = await res.json();
    return data.access_token;
}

/**
 * Returns a WMS URL for the requested layer (NDVI, NDWI, or RGB)
 * @param {string} bbox - Bounding box in format "minX,minY,maxX,maxY"
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} layer - Layer identifier (NDVI, NDWI, TRUE_COLOR)
 */
export async function getSatelliteTileUrl(bbox, date, layer = 'NDVI') {
    if (!SENTINEL_INSTANCE_ID) {
        // Fallback or warning if instance ID is missing
        console.warn("Sentinel Hub Instance ID not configured. NDVI overlay will be unavailable.");
        return null;
    }

    try {
        const token = await getSentinelToken();
        // Returns WMS URL for the specified layer
        return `https://services.sentinel-hub.com/ogc/wms/${SENTINEL_INSTANCE_ID}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layer}&BBOX=${bbox}&TIME=${date}&FORMAT=image/png&TRANSPARENT=TRUE&token=${token}`;
    } catch (error) {
        console.error("Error generating Satellite Tile URL:", error);
        return null;
    }
}

/**
 * Simplified NDVI classification for statistics
 */
export function classifyNdvi(value) {
    if (value < 0)   return { label: 'Água / Construído', color: '#7f8c8d' };
    if (value < 0.2) return { label: 'Solo exposto', color: '#ffd700' };
    if (value < 0.4) return { label: 'Vegetação esparsa', color: '#ff6a00' };
    if (value < 0.6) return { label: 'Vegetação moderada', color: '#90ee90' };
    return { label: 'Vegetação saudável', color: '#00ff88' };
}
