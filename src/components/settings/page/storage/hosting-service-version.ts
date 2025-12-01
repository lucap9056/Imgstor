import { HostingServicesConfig } from "services/settings";

function ensureVersion(content: string): HostingServicesConfig {
    const hostingServices = JSON.parse(content);

    if (typeof hostingServices["version"] !== "number") {
        throw new Error("");
    }

    if (isV1(hostingServices)) {
        return hostingServices;
    }

    throw new Error("");
}

function isV1(input: any): input is HostingServicesConfig {
    if (typeof input !== 'object' || input === null) {
        return false;
    }

    if (typeof input.version !== 'number') {
        return false;
    }

    if (typeof input.local !== 'object' || input.local === null || typeof input.local.isEnabled !== 'boolean') {
        return false;
    }

    if (typeof input.importExternal !== 'object' || input.importExternal === null || typeof input.importExternal.isEnabled !== 'boolean') {
        return false;
    }

    if (typeof input.imgur !== 'object' || input.imgur === null || typeof input.imgur.isEnabled !== 'boolean' || typeof input.imgur.clientId !== 'string') {
        return false;
    }

    if (typeof input.catbox !== 'object' || input.catbox === null || typeof input.catbox.isEnabled !== 'boolean' || typeof input.catbox.proxy !== 'string' || typeof input.catbox.userhash !== 'string' || typeof input.catbox.separatePreviewUpload !== 'boolean') {
        return false;
    }

    if (typeof input.smms !== 'object' || input.smms === null || typeof input.smms.isEnabled !== 'boolean' || typeof input.smms.proxy !== 'string' || typeof input.smms.token !== 'string' || typeof input.smms.separatePreviewUpload !== 'boolean') {
        return false;
    }

    return true;
}

export default {
    ensureVersion
}