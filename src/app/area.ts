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
    if (pathname === "/stores" || pathname.startsWith("/stores/")) {
        return "more";
    }
    return null;
}
