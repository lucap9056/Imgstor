import { FileFormat, FormatNames } from "services/converter/file-formats";
import { WorkerRequest, WorkerResponse } from "services/converter/animation-detecter/worker";


const SUPPORTED_FORMATS: FormatNames[] = [
    "PNG",
    "GIF",
    "WebP",
    "APNG",
];

async function DetectAnimation(abortController: AbortController, file: File, source_type: FileFormat): Promise<boolean> {

    return new Promise((resolve, reject) => {

        const url = URL.createObjectURL(file);
        const worker = new Worker(new URL("worker.ts", import.meta.url), { type: "module" });
        abortController.signal.onabort = () => {
            worker.terminate();
            reject(new Error("Conversion aborted by user."));
            URL.revokeObjectURL(url);
        }

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {

            if (e.data.success) {
                resolve(e.data.result);
            } else {
                reject(e.data.error);
            }
            URL.revokeObjectURL(url);
            worker.terminate();
        }

        worker.onerror = (e) => {
            URL.revokeObjectURL(url);
            worker.terminate();
            reject(e);
        }

        const request: WorkerRequest = { url, source_type };
        worker.postMessage(request);
    });

}

function IsSupported(source_format: FileFormat): boolean {
    return SUPPORTED_FORMATS.includes(source_format.name);
}

export default {
    IsSupported,
    DetectAnimation
}