'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom user marker
const userIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface ServiceItem {
    id: string;
    type: string;
    name: string;
    address: string;
    phone: string;
    hours: string;
    specialization?: string;
    lat: number;
    lng: number;
    distance: number;
}

// Component to handle recentering when center prop changes
function RecenterAutomatically({ center }: { center: { lat: number, lng: number } }) {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng]);
    }, [center.lat, center.lng, map]);
    return null;
}

export default function MapComponent({ items, center }: { items: ServiceItem[], center: { lat: number, lng: number } }) {
    return (
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '12px', zIndex: 1 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterAutomatically center={center} />

            {/* User location marker */}
            <Marker position={[center.lat, center.lng]} icon={userIcon}>
                <Popup>
                    <strong>Search Center</strong>
                </Popup>
            </Marker>

            {/* Service markers */}
            {items.map((item) => (
                <Marker key={item.id} position={[item.lat, item.lng]} icon={icon}>
                    <Popup>
                        <strong style={{ color: '#000' }}>{item.name}</strong><br />
                        <span style={{ fontSize: '0.8rem', color: '#555' }}>{item.address}</span><br />
                        {item.phone && item.phone !== 'Not available' && (
                            <a href={`tel:${item.phone}`} style={{ fontSize: '0.8rem', color: '#2563eb' }}>{item.phone}</a>
                        )}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
