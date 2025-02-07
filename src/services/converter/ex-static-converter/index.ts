import { FileFormat, FormatNames, FORMATS } from "services/converter/file-formats";
import { WorkerRequest, WorkerResponse } from "services/converter/ex-static-converter/worker";

const SUPPORTED_FORMATS: FormatNames[] = [
    "PSD"
];

async function ConvertImage(abortController: AbortController, file: File, source_type: FileFormat): Promise<File> {

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
                const { mimeType, fileExtension } = FORMATS["PNG"];
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

        const request: WorkerRequest = { url, source_type };
        worker.postMessage(request);

    });
}

function IsSupported(source_format: FileFormat): boolean {
    return SUPPORTED_FORMATS.includes(source_format.name);
}

export default {
    IsSupported,
    ConvertImage
}
