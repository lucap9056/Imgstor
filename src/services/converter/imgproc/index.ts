import {
    DecodeStaticImageRequest,
    DecodeStaticImageResponse,
    DetectAnimationRequest,
    DetectAnimationResponse,
    ConvertAnimatedImageRequest,
    ConvertAnimatedImageResponse,
    LogResponse,
    GetFirstFrameRequest,
    GetFirstFrameResponse
} from "services/converter/imgproc/worker";
import { FileFormat, FormatNames, FORMATS, LogPrinter } from "services/converter/file-formats";

const DECODE_STATIC_IMAGE_SUPPORTED_INPUT_FORMATS: FormatNames[] = [
    "PSD"
];

const DETECT_ANIMATION_SUPPORTED_INPUT_FORMAT: FormatNames[] = [
    "PNG",
    "GIF",
    "WebP",
    "APNG",
]

const CONVERT_ANIMATED_IMAGE_SUPPORTED_INPUT_FORMATS: FormatNames[] = [
    "GIF",
    "PNG",
    "APNG",
    "WebP",
];

const CONVERT_ANIMATED_IMAGE_SUPPORTED_OUTPUT_FORMATS: FormatNames[] = [
    "GIF",
    "APNG",
];

const GET_FIRST_FRAME_SUPPORTED_INPUT_FORMATS: FormatNames[] = [
    "GIF",
    "PNG",
    "APNG",
    "WebP",
];

export default class Imgproc {

    public static IsSupportedDecodeStaticImage(sourceFormat: FileFormat): boolean {
        return DECODE_STATIC_IMAGE_SUPPORTED_INPUT_FORMATS.includes(sourceFormat.name);
    }

    public static IsSupportedDetectAnimation(sourceFormat: FileFormat): boolean {
        return DETECT_ANIMATION_SUPPORTED_INPUT_FORMAT.includes(sourceFormat.name);
    }

    public static IsSupportedConvertAnimatedImage(sourceFormat: FileFormat, targetFormat: FileFormat): boolean {
        const sourceSupported = CONVERT_ANIMATED_IMAGE_SUPPORTED_INPUT_FORMATS.includes(sourceFormat.name);
        const targetSupported = CONVERT_ANIMATED_IMAGE_SUPPORTED_OUTPUT_FORMATS.includes(targetFormat.name);
        return sourceSupported && targetSupported;
    }

    public static IsSupportedGetFirstFrame(sourceFormat: FileFormat): boolean {
        return GET_FIRST_FRAME_SUPPORTED_INPUT_FORMATS.includes(sourceFormat.name);
    }

    private abortController: AbortController;
    private worker: Worker;
    private LogMessage: LogPrinter;
    constructor(abortController: AbortController, LogMessage: LogPrinter) {
        this.abortController = abortController;
        this.worker = new Worker(new URL("worker.ts", import.meta.url), { type: "module" });
        this.LogMessage = LogMessage;
    }

    private postMessage<T>(req: T) {
        this.worker.postMessage(req);
    }

    public async DecodeStaticImage(file: File, sourceFormat: FileFormat):
        Promise<{
            decodedFile: File,
            decodedFileFormat: FileFormat
        }> {
        const { abortController, worker, LogMessage } = this;
        const functionName = "DecodeStaticImage";
        const fileUrl = URL.createObjectURL(file);

        return new Promise((resolve, reject) => {

            abortController.signal.addEventListener("abort", () => {
                URL.revokeObjectURL(fileUrl);
                worker.terminate();
                reject("Decode aborted by user.");
            });

            worker.onerror = (err) => {
                reject(err.error);
            }

            worker.onmessage = (e: MessageEvent<DecodeStaticImageResponse | LogResponse>) => {

                if (e.data.functionName === "Log") {
                    LogMessage(e.data.message);
                    return;
                }

                const decodedFileFormat = FORMATS["PNG"];

                const decodedFile = new File(
                    [e.data.decodedFile],
                    file.name.replace(/(\.[^.]+)$/, decodedFileFormat.fileExtension[0]),
                    { type: decodedFileFormat.mimeType }
                );

                resolve({ decodedFile, decodedFileFormat });
            }

            this.postMessage<DecodeStaticImageRequest>({
                functionName, fileUrl, sourceFormat
            });

        });
    }

    public async DetectAnimation(file: File, sourceFormat: FileFormat): Promise<{ isAnimation: boolean }> {
        const { abortController, worker, LogMessage } = this;
        const functionName = "DetectAnimation";
        const fileUrl = URL.createObjectURL(file);

        return new Promise((resolve, reject) => {

            abortController.signal.addEventListener("abort", () => {
                URL.revokeObjectURL(fileUrl);
                worker.terminate();
                reject("Detection aborted by user.");
            });

            worker.onerror = (err) => {
                reject(err.error);
            }

            worker.onmessage = (e: MessageEvent<DetectAnimationResponse | LogResponse>) => {
                if (e.data.functionName == "Log") {
                    LogMessage(e.data.message);
                    return;
                }

                const { isAnimation } = e.data;
                resolve({ isAnimation });
            }

            this.postMessage<DetectAnimationRequest>({
                functionName, fileUrl, sourceFormat
            });

        });

    }

    public async ConvertAnimatedImage(file: File, sourceFormat: FileFormat, targetFormat: FileFormat):
        Promise<{
            converted: {
                file: File,
                fileFormat: FileFormat
            },
            firstFrame: {
                file: File
                fileFormat: FileFormat
            }
        }> {
        const { abortController, worker, LogMessage } = this;
        const functionName = "ConvertAnimatedImage";
        const fileUrl = URL.createObjectURL(file);

        return new Promise((resolve, reject) => {

            abortController.signal.addEventListener("abort", () => {
                URL.revokeObjectURL(fileUrl);
                worker.terminate();
                reject("Convertion aborted by user.");
            });

            worker.onerror = (err) => {
                reject(err.error);
            }

            worker.onmessage = (e: MessageEvent<ConvertAnimatedImageResponse | LogResponse>) => {
                if (e.data.functionName == "Log") {
                    LogMessage(e.data.message);
                    return;
                }

                const convertedFile = new File(
                    [e.data.convertedFile],
                    file.name.replace(/(\.[^.]+)$/, targetFormat.fileExtension[0]),
                    { type: targetFormat.mimeType }
                );

                const firstFrameFormat = FORMATS["PNG"];
                const firstFrame = new File(
                    [e.data.firstFrame],
                    file.name.replace(/(\.[^.]+)$/, firstFrameFormat.fileExtension[0]),
                    { type: firstFrameFormat.mimeType }
                );

                const convertedFileFormat = targetFormat;
                resolve({
                    converted: {
                        file: convertedFile,
                        fileFormat: convertedFileFormat,
                    },
                    firstFrame: {
                        file: firstFrame,
                        fileFormat: firstFrameFormat
                    }
                });
            }

            this.postMessage<ConvertAnimatedImageRequest>({
                functionName, fileUrl, sourceFormat, targetFormat
            });

        });
    }

    public async GetFirstFrame(file: File, sourceFormat: FileFormat): Promise<{
        firstFrameFile: File,
        firstFrameFileFormat: FileFormat
    }> {
        const { abortController, worker, LogMessage } = this;
        const functionName = "GetFirstFrame";
        const fileUrl = URL.createObjectURL(file);

        return new Promise((resolve, reject) => {

            abortController.signal.addEventListener("abort", () => {
                URL.revokeObjectURL(fileUrl);
                worker.terminate();
                reject("Get first frame aborted by user.");
            });

            worker.onerror = (err) => {
                reject(err.error);
            }

            worker.onmessage = (e: MessageEvent<GetFirstFrameResponse | LogResponse>) => {
                if (e.data.functionName == "Log") {
                    LogMessage(e.data.message);
                    return;
                }

                const firstFrameFileFormat = FORMATS["PNG"];

                const firstFrameFile = new File(
                    [e.data.firstFrame],
                    file.name.replace(/(\.[^.]+)$/, firstFrameFileFormat.fileExtension[0]),
                    { type: firstFrameFileFormat.mimeType }
                );

                resolve({ firstFrameFile, firstFrameFileFormat });
            }

            this.postMessage<GetFirstFrameRequest>({
                functionName, fileUrl, sourceFormat
            });
        });

    }
}