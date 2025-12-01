export type FormatNames =
    "JPEG" |
    "PNG" |
    "GIF" |
    "BMP" |
    "TIFF" |
    "WebP" |
    "APNG" |
    "JPEG 2000" |
    "PPM" |
    "PGM" |
    "PBM" |
    "PNM" |
    "XBM" |
    "XPM" |
    "ICO" |
    "AVIF" |
    "PSD" |
    "MP4" |
    "MKV" |
    "WEBM" |
    "MOV" |
    "AVI" |
    "FLV" |
    "WMV" |
    "MPEG" |
    "3GP" |
    "OGG";

export type FileFormat = {
    name: FormatNames;
    mimeType: string;
    fileExtension: string[];
};

export const FORMATS: { [name in FormatNames]: FileFormat } = {
    "JPEG": {
        name: "JPEG",
        mimeType: "image/jpeg",
        fileExtension: [".jpg", ".jpeg"]
    },
    "PNG": {
        name: "PNG",
        mimeType: "image/png",
        fileExtension: [".png"]
    },
    "GIF": {
        name: "GIF",
        mimeType: "image/gif",
        fileExtension: [".gif"]
    },
    "BMP": {
        name: "BMP",
        mimeType: "image/bmp",
        fileExtension: [".bmp"]
    },
    "TIFF": {
        name: "TIFF",
        mimeType: "image/tiff",
        fileExtension: [".tiff"]
    },
    "WebP": {
        name: "WebP",
        mimeType: "image/webp",
        fileExtension: [".webp"]
    },
    "APNG": {
        name: "APNG",
        mimeType: "image/apng",
        fileExtension: [".apng"]
    },
    "JPEG 2000": {
        name: "JPEG 2000",
        mimeType: "image/jp2",
        fileExtension: [".jp2"]
    },
    "PPM": {
        name: "PPM",
        mimeType: "image/x-portable-pixmap",
        fileExtension: [".ppm"]
    },
    "PGM": {
        name: "PGM",
        mimeType: "image/x-portable-graymap",
        fileExtension: [".pgm"]
    },
    "PBM": {
        name: "PBM",
        mimeType: "image/x-portable-bitmap",
        fileExtension: [".pbm"]
    },
    "PNM": {
        name: "PNM",
        mimeType: "image/x-portable-anymap",
        fileExtension: [".pnm"]
    },
    "XBM": {
        name: "XBM",
        mimeType: "image/x-xbitmap",
        fileExtension: [".xbm"]
    },
    "XPM": {
        name: "XPM",
        mimeType: "image/x-xpixmap",
        fileExtension: [".xpm"]
    },
    "ICO": {
        name: "ICO",
        mimeType: "image/vnd.microsoft.icon",
        fileExtension: [".ico"]
    },
    "AVIF": {
        name: "AVIF",
        mimeType: "image/avif",
        fileExtension: [".avif"]
    },
    "PSD": {
        name: "PSD",
        mimeType: "image/vnd.adobe.photoshop",
        fileExtension: [".psd"]
    },
    "MP4": {
        name: "MP4",
        mimeType: "video/mp4",
        fileExtension: [".mp4"]
    },
    "MKV": {
        name: "MKV",
        mimeType: "video/x-matroska",
        fileExtension: [".mkv"]
    },
    "WEBM": {
        name: "WEBM",
        mimeType: "video/webm",
        fileExtension: [".webm"]
    },
    "MOV": {
        name: "MOV",
        mimeType: "video/quicktime",
        fileExtension: [".mov"]
    },
    "AVI": {
        name: "AVI",
        mimeType: "video/x-msvideo",
        fileExtension: [".avi"]
    },
    "FLV": {
        name: "FLV",
        mimeType: "video/x-flv",
        fileExtension: [".flv"]
    },
    "WMV": {
        name: "WMV",
        mimeType: "video/x-ms-wmv",
        fileExtension: [".wmv"]
    },
    "MPEG": {
        name: "MPEG",
        mimeType: "video/mpeg",
        fileExtension: [".mpeg", ".mpg"]
    },
    "3GP": {
        name: "3GP",
        mimeType: "video/3gpp",
        fileExtension: [".3gp"]
    },
    "OGG": {
        name: "OGG",
        mimeType: "video/ogg",
        fileExtension: [".ogv"]
    }
};

export type LogPrinter = (msg: string) => void;