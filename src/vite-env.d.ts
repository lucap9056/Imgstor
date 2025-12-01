/// <reference types="vite/client" />

interface ImportMetaEnv {
    VITE_GOOGLE_API_KEY: string;
    VITE_GOOGLE_CLIENT_ID: string;
    VITE_APP_NAME: string;
    VITE_SERVER_HOST: string;
    VITE_SERVER_PORT: string;
    VITE_SSL_CRT: string;
    VITE_SSL_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}