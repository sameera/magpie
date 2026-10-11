// Firebase Hosting serves the auth helper on the app's own domain. Keeping
// redirect sign-in same-origin lets Firebase recover it when third-party
// storage is blocked, including on alternate Hosting domains.
export function authDomainForHost(hostname: string, configuredDomain: string, useEmulators: boolean): string {
    if (!useEmulators && (hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com"))) {
        return hostname;
    }
    return configuredDomain;
}
