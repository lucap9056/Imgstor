import { FileFormat, FormatNames, FORMATS, LogPrinter } from "services/converter/file-formats";
import AnimationDetecter from "services/converter/animation-detecter";
import CanvasConverter from "services/converter/canvas-converter";
import ExStaticConverter from "services/converter/ex-static-converter";
import AmgConverter from "services/converter/amg-converter";
import FFmpeg from "services/converter/ffmpeg";

const ONLY_STATIC_FORMATS: FormatNames[] = [
    "JPEG",
    "BMP",
    "TIFF",
    "JPEG 2000",
    "PPM",
    "PGM",
    "PBM",
    "PNM",
    "XBM",
    "XPM",
    "ICO",
    "AVIF",
    "PSD"
];

const ONLY_DYNAMUC_FORMATS: FormatNames[] = [
    "MP4",
    "MKV",
    "WEBM",
    "MOV",
    "AVI",
    "FLV",
    "WMV",
    "MPEG",
    "3GP",
    "OGG"
];

type FilePreviewType = "video" | "image";

export class FilePreview {
    public static readonly TYPE = class {
        public static readonly VIDEO: FilePreviewType = "video";
        public static readonly IMAGE: FilePreviewType = "image";
    }

    public readonly type: FilePreviewType;
    public readonly url: string;
    constructor(fileType: FilePreviewType, url: string) {
        this.type = fileType;
        this.url = url;
    }
}

export default class Converter {
    public static readonly SUPPORTED_FILE_FORMATS = FORMATS;

    public static readonly InferImageFormat = (file: File): FileFormat | undefined => {
        const mimeType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        for (const format of Object.values(FORMATS)) {
            if (mimeType === format.mimeType) {
                return format;
            }

            for (const ext of format.fileExtension) {
                if (fileName.endsWith(ext)) {
                    return format;
                }
            }

        }

    }

    public static FileSizeFormat(bytes: number, decimals: number = 2): string {
        if (bytes < 0) {
            throw new Error("File size cannot be negative.");
        }

        const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        if (bytes === 0) return `0 ${sizes[0]}`;

        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

        return `${size} ${sizes[i]}`;
    }

    public async AnimationDetect(abortController: AbortController, file: File): Promise<boolean> {

        const sourceFormat = Converter.InferImageFormat(file);


        if (!sourceFormat) {
            throw new Error("Failed to identify the source file format. Please ensure the file is valid.");
        }

        if (ONLY_STATIC_FORMATS.includes(sourceFormat.name)) {
            return false;
        }

        if (ONLY_DYNAMUC_FORMATS.includes(sourceFormat.name)) {
            return true;
        }

        if (AnimationDetecter.IsSupported(sourceFormat)) {
            return AnimationDetecter.DetectAnimation(abortController, file, sourceFormat);
        }

        throw new Error("Unable to determine animation format. Please check if the file is supported.");
    }

    public async StaticConvert(abortController: AbortController, file: File, targetFormat: FileFormat, logPrinter: LogPrinter): Promise<File> {

        const sourceFormat = Converter.InferImageFormat(file);

        if (!sourceFormat) {
            throw new Error("Failed to identify the source file format. Please ensure the file is valid.");
        }

        if (CanvasConverter.IsSupported(sourceFormat, targetFormat)) {
            return CanvasConverter.ConvertImage(file, targetFormat);
        }

        if (ExStaticConverter.IsSupported(sourceFormat)) {
            file = await ExStaticConverter.ConvertImage(abortController, file, sourceFormat);
            if (targetFormat.name === FORMATS["PNG"].name) {
                return file;
            }
        }

        if (!FFmpeg.SUPPORTED_STATIC_FORMATS.includes(targetFormat.name)) {
            throw new Error(`The target format "${targetFormat.name}" is not supported. Please choose a different format.`);
        }

        const blob = await FFmpeg.StaticConvert(abortController, file, targetFormat, logPrinter);

        const { mimeType, fileExtension } = targetFormat;

        return new File([blob], file.name.replace(/\.[^/.]+$/, fileExtension[0]), { type: mimeType });
    }

    public async DynamicConvert(abortController: AbortController, file: File, sourceFormat: FileFormat, targetFormat: FileFormat, logPrinter: LogPrinter): Promise<File> {

        if (AmgConverter.IsSupported(sourceFormat, targetFormat)) {
            return AmgConverter.ConvertAnimationImage(abortController, file, sourceFormat, targetFormat);
        }

        if (!FFmpeg.SUPPORTED_DYNAMIC_FORMATS.includes(targetFormat.name)) {
            throw new Error(`The target format "${targetFormat.name}" is not supported. Please choose a different format.`);
        }

        const preprocessedFile = await FFmpeg.DynamicPreprocess(abortController, file, sourceFormat);

        const { mimeType, fileExtension } = targetFormat;

        const blob = await FFmpeg.DynamicConvert(abortController, preprocessedFile, targetFormat, logPrinter);
        return new File([blob], file.name.replace(/\.[^/.]+$/, fileExtension[0]), { type: mimeType });

    }

    public async StaticPreviewImage(abortController: AbortController, file: File, format: FileFormat, logPrinter: LogPrinter): Promise<FilePreview> {
        switch (format.name) {
            case "JPEG":
            case "PNG":
            case "APNG":
            case "GIF":
            case "WebP":
            case "AVIF": {
                const url = URL.createObjectURL(file);
                return new FilePreview(FilePreview.TYPE.IMAGE, url);
            }
        }

        const converted = await this.StaticConvert(abortController, file, FORMATS["PNG"], logPrinter);
        const url = URL.createObjectURL(converted);
        return new FilePreview(FilePreview.TYPE.IMAGE, url);
    }

    public async DynamicPreviewImage(file: File, format: FileFormat): Promise<FilePreview | undefined> {

        switch (format.name) {
            case "GIF":
            case "PNG":
            case "APNG":
            case "WebP": {
                const url = URL.createObjectURL(file);
                return new FilePreview(FilePreview.TYPE.IMAGE, url);
            }
            case "MP4":
            case "WEBM":
            case "AVI":
            case "OGG": {
                const url = URL.createObjectURL(file);
                return new FilePreview(FilePreview.TYPE.VIDEO, url);
            }
        }

    }

}