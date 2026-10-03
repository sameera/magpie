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
}

export function StoreMap({ map, label, nextZoneId, scanUrl }: StoreMapProps) {
    return (
        <svg
            role="img"
            aria-label={label}
            viewBox={`0 0 ${map.width} ${map.height}`}
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
                        fill={zoneFill[zone.kind]}
                        stroke={zone.id === nextZoneId ? "var(--trinket)" : "var(--zone-edge)"}
                        strokeWidth={zone.id === nextZoneId ? 1.5 : 0.4}
                    />
                    <text
                        x={zone.x + zone.width / 2}
                        y={zone.y + zone.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.min(4, zone.height / 3)}
                        fontWeight={700}
                        fill="var(--ink)"
                    >
                        {zone.label.toUpperCase()}
                    </text>
                </g>
            ))}
        </svg>
    );
}
