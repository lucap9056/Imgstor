import { FileFormat } from "services/converter/file-formats";
import Wasm, { WasmDecodeStaticImage, WasmDetectAnimation, WasmConvertAnimatedImage, WasmGetFirstFrame } from "services/converter/imgproc/wasm/pkg";

export interface DecodeStaticImageRequest {
    functionName: "DecodeStaticImage",
    fileUrl: string,
    sourceFormat: FileFormat
}

export interface DecodeStaticImageResponse {
    functionName: "DecodeStaticImage",
    decodedFile: Uint8Array
}

export interface DetectAnimationRequest {
    functionName: "DetectAnimation",
    fileUrl: string
    sourceFormat: FileFormat
}

export interface DetectAnimationResponse {
    functionName: "DetectAnimation",
    isAnimation: boolean
}

export interface ConvertAnimatedImageRequest {
    functionName: "ConvertAnimatedImage"
    fileUrl: string
    sourceFormat: FileFormat,
    targetFormat: FileFormat
}

export interface ConvertAnimatedImageResponse {
    functionName: "ConvertAnimatedImage",
    convertedFile: Uint8Array
    firstFrame: Uint8Array
}

export interface GetFirstFrameRequest {
    functionName: "GetFirstFrame",
    fileUrl: string
    sourceFormat: FileFormat
}

export interface GetFirstFrameResponse {
    functionName: "GetFirstFrame",
    firstFrame: Uint8Array
}

export interface LogResponse {
    functionName: "Log",
    message: string
}

export interface ErrorResponse {
    error: string
}

export type WorkerRequest = DecodeStaticImageRequest | DetectAnimationRequest | ConvertAnimatedImageRequest | GetFirstFrameRequest;

type WorkerResponseMap = {
    "DecodeStaticImage": DecodeStaticImageResponse;
    "DetectAnimation": DetectAnimationResponse;
    "ConvertAnimatedImage": ConvertAnimatedImageResponse;
    "GetFirstFrame": GetFirstFrameResponse;
};

const wasm = Wasm();

function Log(message: string) {
    const res: LogResponse = {
        functionName: "Log",
        message
    };
    self.postMessage(res);
}

function resolve(res: WorkerResponseMap[keyof WorkerResponseMap]) {
    self.postMessage(res);
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {

    try {

        const { functionName, fileUrl, sourceFormat } = e.data;
        const sourceFormatName = sourceFormat.name;

        const fetchData = fetch(fileUrl).then((res) => res.blob()).then((blob) => blob.arrayBuffer()).then((buffer) => new Uint8Array(buffer));


        const [sourceData] = await Promise.all([fetchData, wasm]);

        switch (functionName) {
            case "DecodeStaticImage": {
                const decodedFile = WasmDecodeStaticImage(sourceData, sourceFormatName, Log);
                resolve({
                    functionName,
                    decodedFile
                });
                break;
            }
            case "DetectAnimation": {
                const isAnimation = WasmDetectAnimation(sourceData, sourceFormatName);
                resolve({
                    functionName,
                    isAnimation
                });
                break;
            }
            case "ConvertAnimatedImage": {
                const targetFormatName = e.data.targetFormat.name;
                const converted = WasmConvertAnimatedImage(sourceData, sourceFormatName, targetFormatName, Log);
                const firstFrame = converted.first_frame;
                const convertedFile = converted.converted_file();
                resolve({
                    functionName,
                    convertedFile,
                    firstFrame
                });
                break;
            }
            case "GetFirstFrame": {
                const sourceFormatName = e.data.sourceFormat.name;
                const firstFrame = WasmGetFirstFrame(sourceData, sourceFormatName);
                resolve({
                    functionName,
                    firstFrame
                });
                break;
            }
        }

    } catch (err: any) {

        if (!(err instanceof Error)) {
            if (err instanceof Object) {
                throw new Error(JSON.stringify(err));
            } else {
                throw new Error(err.toString());
            }
        }
        throw err;
    }
    finally {
        self.close();
    }
};