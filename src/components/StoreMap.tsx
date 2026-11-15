import type { StoreMapData, ZoneKind } from "../data/model";

const zoneFill: Record<ZoneKind, string> = {
    produce: "var(--zone-produce)",
    dairy: "var(--zone-dairy)",
    bakery: "var(--zone-bakery)",
    meat: "var(--zone-meat)",
    frozen: "var(--zone-frozen)",
    pantry: "var(--zone-pantry)",
};

interface StoreMapProps {
    map: StoreMapData;
    label: string;
    // Zone to mark as "next".
    nextZoneId?: string;
    scanUrl?: string | null;
    fitZones?: boolean;
}

export function StoreMap({ map, label, nextZoneId, scanUrl, fitZones = false }: StoreMapProps) {
    let top = 0;
    let height = map.height;
    if (fitZones && map.zones.length > 0) {
        // Keep the horizontal scale and leave room for the zone outlines.
        top = Math.min(...map.zones.map(zone => zone.y)) - 2;
        const bottom = Math.max(...map.zones.map(zone => zone.y + zone.height)) + 2;
        height = bottom - top;
    }

    return (
        <svg
            role="img"
            aria-label={label}
            viewBox={`0 ${top} ${map.width} ${height}`}
            className="w-full rounded-lg bg-surface-sunken"
        >
            {scanUrl && <image href={scanUrl} width={map.width} height={map.height} opacity={0.35} />}
            {map.zones.map((zone) => (
                <g key={zone.id} data-zone={zone.id}>
                    <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.width}
                        height={zone.height}
                        rx={1.5}
                        fill={zoneFill[zone.kind ?? "pantry"]}
                        stroke={zone.id === nextZoneId ? "var(--trinket)" : "var(--zone-edge)"}
                        strokeWidth={zone.id === nextZoneId ? 1.5 : 0.4}
                    />
                    <text
                        x={zone.x + zone.width / 2}
                        y={zone.y + zone.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.min(4, zone.height / 3)}
                        fontFamily="var(--font-display)"
                        fontWeight={700}
                        letterSpacing="0.04em"
                        fill="var(--ink)"
                    >
                        {zone.label.toUpperCase()}
                    </text>
                </g>
            ))}
        </svg>
    );
}
