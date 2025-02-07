import { FileFormat } from "services/converter/file-formats";
import Wasm, { WasmDetectAnimation } from "services/converter/animation-detecter/wasm/pkg";

export interface WorkerRequest {
    url: string
    source_type: FileFormat
}

interface SuccessResponse {
    success: true
    result: boolean
}

interface ErrorResponse {
    success: false
    error: Error
}

export type WorkerResponse = SuccessResponse | ErrorResponse;

const wasm = Wasm();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const { url, source_type } = e.data;

    try {
        const fetchData = fetch(url).then((res) => res.blob()).then((blob) => blob.arrayBuffer()).then((buffer) => new Uint8Array(buffer));
        await wasm;
        const data = await fetchData;
        const result = WasmDetectAnimation(data, source_type.name);

        const response: SuccessResponse = {
            success: true,
            result
        };

        self.postMessage(response);
    } catch (err: any) {

        if (!(err instanceof Error)) {

            if (err instanceof Object) {
                err = new Error(JSON.stringify(err));
            } else {
                err = new Error(err.toString());
            }
        }

        const response: ErrorResponse = {
            success: false,
            error: err
        };

        self.postMessage(response);
    }
    finally {
        self.close();
    }

}