// Firebase Hosting serves the auth helper on the app's own domain. Keeping
// redirect sign-in same-origin lets Firebase recover it when third-party
// storage is blocked, including on alternate Hosting domains.
export function authDomainForHost(hostname: string, configuredDomain: string, useEmulators: boolean): string {
    // Local popups use Firebase's default auth endpoint. The web.app domain
    // override is for same-origin redirects on Firebase Hosting.
    if (!useEmulators && ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
        && /^[a-z0-9-]+\.web\.app$/.test(configuredDomain)) {
        return configuredDomain.replace(/\.web\.app$/, ".firebaseapp.com");
    }
    if (!useEmulators && (hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com"))) {
        return hostname;
    }
    return configuredDomain;
}
