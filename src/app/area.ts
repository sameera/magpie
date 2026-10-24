export type Area = "list" | "shop" | "more";

// The marked area comes from the start of the path, so it is right after a
// reload or a saved link.
export function areaForPath(pathname: string): Area | null {
    if (pathname === "/" || pathname === "/items" || pathname.startsWith("/items/")) {
        return "list";
    }
    if (pathname === "/shop" || pathname.startsWith("/shop/")) {
        return "shop";
    }
    if (pathname === "/stores" || pathname.startsWith("/stores/") || pathname === "/inventory" || pathname.startsWith("/inventory/")) {
        return "more";
    }
    return null;
}

// One store's In Store page, which draws its own bottom menu.
export function isInStorePath(pathname: string): boolean {
    return pathname.startsWith("/shop/");
}
