import { FileFormat, FormatNames } from "services/converter/file-formats";
import { WorkerRequest, WorkerResponse } from "services/converter/amg-converter/worker";

const SUPPORTED_INPUT_FORMATS: FormatNames[] = [
    "GIF",
    "PNG",
    "APNG",
    "WebP",
];

const SUPPORTED_OUTPUT_FORMATS: FormatNames[] = [
    "GIF",
    "APNG",
];

async function ConvertAnimationImage(abortController: AbortController, file: File, source_format: FileFormat, target_format: FileFormat): Promise<File> {

    return new Promise((resolve, reject) => {

        const url = URL.createObjectURL(file);
        const worker = new Worker(new URL("worker.ts", import.meta.url), { type: "module" });
        abortController.signal.onabort = () => {
            URL.revokeObjectURL(url);
            worker.terminate();
            reject(new Error("Conversion aborted by user."));
        }

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {

            if (e.data.success) {
                const { fileExtension, mimeType } = target_format;
                const fileName = file.name.replace(/\.[^/.]+$/, fileExtension[0]);

                resolve(new File([e.data.result], fileName, { type: mimeType }));
            } else {
                reject(e.data.error);
            }
            worker.terminate();
            URL.revokeObjectURL(url);
        }

        worker.onerror = (err) => {
            URL.revokeObjectURL(url);
            worker.terminate();
            reject(err);
        }

        const request: WorkerRequest = { url, source_format, target_format };
        worker.postMessage(request);

    });
}

function IsSupported(source_format: FileFormat, target_format: FileFormat): boolean {
    return SUPPORTED_INPUT_FORMATS.includes(source_format.name) && SUPPORTED_OUTPUT_FORMATS.includes(target_format.name);
}

export default {
    IsSupported,
    ConvertAnimationImage
}
