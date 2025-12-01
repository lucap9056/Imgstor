import { FormatNames, FileFormat, FORMATS, LogPrinter } from "services/converter/file-formats";
import { FFMessageLoadConfig, FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import Imgproc from "../imgproc";

const formatCommands: Partial<{ [name in FormatNames]: string }> = {
    "GIF": `-i %input% -framerate 10 -vsync vfr -c:v gif %output%`,
    "APNG": `-i %input% -plays 0 -framerate 10 -vsync vfr -c:v apng %output%`,
    "WebP": `-i %input% -c:v libwebp -q:v 70 -vsync vfr -preset default -loop 0 %output%`,
    "MP4": `-i %input% -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p -an %output%`,
    "MKV": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "WEBM": `-i %input% -c:v libvpx -crf 23 -preset medium -an %output%`,
    "MOV": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "AVI": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "FLV": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "WMV": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "MPEG": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "3GP": `-i %input% -c:v libx264 -crf 23 -preset medium -an %output%`,
    "OGG": `-i %input% -c:v libtheora -q:v 7 -an %output%`,
};

interface CommandOptions {
    input: string
    output: string
}

const config: FFMessageLoadConfig = {
    coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
    classWorkerURL: new URL("node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js", import.meta.url).toString(),
}

const SUPPORTED_STATIC_FORMATS: FormatNames[] = [
    "JPEG",
    "PNG",
    "GIF",
    "BMP",
    "TIFF",
    "WebP",
    "JPEG 2000",
    "PPM",
    "PGM",
    "PBM",
    "PNM",
    "XBM",
    "AVIF"
];

const SUPPORTED_ANIMATION_FORMATS: FormatNames[] = [
    "GIF",
    "APNG",
    "WebP",
    "WEBM",
    "MP4",
    "MKV",
    "MOV",
    "AVI",
    "FLV",
    "WMV",
    "MPEG",
    "3GP",
    "OGG",
];

async function ConvertStatic(abortController: AbortController, file: File, { mimeType, fileExtension }: FileFormat, LogMessage: LogPrinter): Promise<Blob> {

    return new Promise(async (resolve, reject) => {

        const ffmpeg = new FFmpeg();

        abortController.signal.onabort = () => {
            reject(new Error("Conversion aborted by user."));
        }

        try {
            await ffmpeg.load(config, {
                signal: abortController.signal
            });
        }
        catch (err) {
            return reject(err);
        }

        const filePath = `static_convert\\${file.name}`.replace(/  */g, '_');
        const convertedFilePath = filePath.replace(/\.[^/.]+$/, fileExtension[0]);

        ffmpeg.on("log", (e) => {
            LogMessage(e.message);
        });

        try {
            const fileData = await fetchFile(file);

            await ffmpeg.writeFile(filePath, fileData);
            await ffmpeg.exec(["-i", filePath, convertedFilePath]);

            const convertedFile = await ffmpeg.readFile(convertedFilePath)
                .then((d) => new Blob([d], { type: mimeType }));

            resolve(convertedFile);
        }
        catch (err) {
            console.error("Error during conversion:", err);
            reject(new Error(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`));
        }
        finally {
            ffmpeg.terminate();
        }

    });
}

export type ConvertedFile = {
    converted: {
        file: File, fileFormat: FileFormat
    },
    firstFrame: {
        file: File, fileFormat: FileFormat
    }
};

async function PreprocessAnimation(abortController: AbortController, file: File, sourceFormat: FileFormat, LogMessage: LogPrinter): Promise<ConvertedFile | undefined> {
    switch (sourceFormat.name) {
        case "WebP":
            const imgproc = new Imgproc(abortController, LogMessage);
            return await imgproc.ConvertAnimatedImage(file, sourceFormat, FORMATS["APNG"]);
    }
}

async function ConvertAnimation<T extends boolean>(abortController: AbortController, file: File, targetForamt: FileFormat, extractFirstFrame: T, LogMessage: LogPrinter):
    Promise<{
        converted: {
            file: File, fileFormat: FileFormat
        },
        firstFrame?: {
            file: File, fileFormat: FileFormat
        }
    }> {
    const { name, mimeType, fileExtension } = targetForamt;

    return new Promise(async (resolve, reject) => {

        const ffmpeg = new FFmpeg();

        abortController.signal.onabort = () => {
            reject(new Error("Conversion aborted by user."));
        }

        try {
            await ffmpeg.load(config, {
                signal: abortController.signal
            });
        }
        catch (err) {
            return reject(new Error(`Failed to load FFmpeg: ${err instanceof Error ? err.message : String(err)}`));
        }

        const filePath = `dynamic_convert\\${file.name}`.replace(/  */g, '_');
        const convertedFileName = file.name.replace(/\.[^/.]+$/, fileExtension[0]);
        const convertedFilePath = `dynamic_convert\\${convertedFileName}`.replace(/  */g, '_');
        const firstFrameFormat = FORMATS["PNG"];
        const firstFramePath = `preview_${filePath.replace(/\.[^/.]+$/, `.${firstFrameFormat.fileExtension[0]}`)}`;


        const precmds = formatCommands[name];

        if (!precmds) {
            return reject(new Error(`No conversion command found for format "${name}".`));
        }

        ffmpeg.on("log", (e) => {
            LogMessage(e.message);
        });

        try {
            const fileData = await fetchFile(file);

            await ffmpeg.writeFile(filePath, fileData);

            const options: CommandOptions = {
                input: filePath,
                output: convertedFilePath
            };

            const cmds = precmds.replace(/%(\w+)%/g, (match, key: keyof CommandOptions) => {
                return options[key] || match;
            });

            const firstFrameCommand = ['-i', filePath, '-ss', '00:00:00.000', '-vframes', '1', firstFramePath];

            if (extractFirstFrame) {

                const [convertedFile, firstFrame] = await Promise.all([
                    (async () => {
                        await ffmpeg.exec(cmds.split(/ /))
                        const convertedBlob = await ffmpeg.readFile(convertedFilePath);
                        return new Blob([convertedBlob], { type: mimeType });
                    })(), (async () => {
                        await ffmpeg.exec(firstFrameCommand);
                        const previewImageBlob = await ffmpeg.readFile(firstFramePath);
                        return new Blob([previewImageBlob], { type: mimeType });
                    })()
                ]);

                const result: ConvertedFile = {
                    converted: {
                        file: new File([convertedFile], convertedFileName, { type: mimeType }),
                        fileFormat: targetForamt
                    },
                    firstFrame: {
                        file: new File([firstFrame], ""),
                        fileFormat: firstFrameFormat
                    }
                };
                resolve(result);

            } else {

                await ffmpeg.exec(cmds.split(/ /))
                const convertedBlob = await ffmpeg.readFile(convertedFilePath);
                const convertedFile = new Blob([convertedBlob], { type: mimeType });

                resolve({
                    converted: {
                        file: new File([convertedFile], convertedFileName, { type: mimeType }),
                        fileFormat: targetForamt
                    }
                });

            }
        }
        catch (err) {
            console.error("Error during conversion:", err);
            reject(new Error(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`));
        }
        finally {
            ffmpeg.terminate();
        }

    });

}


async function ExtractFirstFrameFromAnimation(abortController: AbortController, file: File, LogMessage: LogPrinter):
    Promise<{
        firstFrameFile: File;
        firstFrameFileFormat: FileFormat;
    }> {
    return new Promise(async (resolve, reject) => {
        const ffmpeg = new FFmpeg();

        abortController.signal.onabort = () => {
            reject(new Error("Frame extraction aborted by user."));
        };

        try {
            await ffmpeg.load(config, {
                signal: abortController.signal
            });
        } catch (err) {
            return reject(new Error(`Failed to load FFmpeg: ${err instanceof Error ? err.message : String(err)}`));
        }

        const targetFormat = FORMATS["PNG"];

        const inputPath = `extract_frame\\${file.name}`.replace(/  */g, '_');
        const outputPath = `preview_${inputPath.replace(/\.[^/.]+$/, `.${targetFormat.fileExtension[0]}`)}`;
        const outputFileName = file.name.replace(/\.[^/.]+$/, `.${targetFormat.fileExtension[0]}`);

        ffmpeg.on("log", (e) => {
            LogMessage(e.message);
        });

        try {
            const fileData = await fetchFile(file);
            await ffmpeg.writeFile(inputPath, fileData);

            const command = ['-i', inputPath, '-ss', '00:00:00', '-vframes', '1', outputPath];

            await ffmpeg.exec(command);

            const firstFrameFile = await ffmpeg.readFile(outputPath);

            resolve({
                firstFrameFile: new File([firstFrameFile], outputFileName, { type: targetFormat.mimeType }),
                firstFrameFileFormat: targetFormat
            });

        } catch (err) {
            console.error("Error during frame extraction:", err);
            reject(new Error(`Frame extraction failed: ${err instanceof Error ? err.message : String(err)}`));
        } finally {
            ffmpeg.terminate();
        }
    });
}

export default {
    SUPPORTED_ANIMATION_FORMATS,
    SUPPORTED_STATIC_FORMATS,
    ConvertStatic,
    ConvertAnimation,
    PreprocessAnimation,
    ExtractFirstFrameFromAnimation
}