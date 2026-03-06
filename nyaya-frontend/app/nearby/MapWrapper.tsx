'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(
    () => import('./MapComponent'),
    {
        ssr: false,
        loading: () => <div style={{ height: '400px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div></div>
    }
) as unknown as React.ComponentType<MapWrapperProps>;

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

interface MapWrapperProps {
    items: ServiceItem[];
    center: { lat: number, lng: number };
}

export default function MapWrapper({ items, center }: MapWrapperProps) {
    return <Map items={items} center={center} />;
}
