import { FormatNames, FileFormat, FORMATS, LogPrinter } from "services/converter/file-formats";
import AmgConverter from "services/converter/amg-converter";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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

const SUPPORTED_DYNAMIC_FORMATS: FormatNames[] = [
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

async function StaticConvert(abortController: AbortController, file: File, { mimeType, fileExtension }: FileFormat, logPrinter: LogPrinter): Promise<Blob> {

    return new Promise(async (resolve, reject) => {

        const ffmpeg = new FFmpeg();

        abortController.signal.onabort = () => {
            ffmpeg.terminate();
            reject(new Error(""));
        }

        try {
            await ffmpeg.load({
                coreURL: new URL("node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js", import.meta.url).toString(),
                wasmURL: new URL("node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm", import.meta.url).toString(),
                classWorkerURL: new URL("node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js", import.meta.url).toString(),
            });
        }
        catch (err) {
            return reject(err);
        }

        const filePath = `static_convert\\${file.name}`.replace(/  */g, '_');
        const convertedFilePath = filePath.replace(/\.[^/.]+$/, fileExtension[0]);

        ffmpeg.on("log", (e) => {
            logPrinter(e.message);
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
            reject(err);
        }

        ffmpeg.terminate();

    });
}

async function DynamicPreprocess(abortController: AbortController, file: File, sourceFormat: FileFormat): Promise<File> {

    switch (sourceFormat.name) {
        case "WebP":
            return AmgConverter.ConvertAnimationImage(abortController, file, sourceFormat, FORMATS["APNG"]);
        default:
            return file;
    }
}

async function DynamicConvert(abortController: AbortController, file: File, { name, mimeType, fileExtension }: FileFormat, logPrinter: LogPrinter): Promise<Blob> {

    return new Promise(async (resolve, reject) => {

        const ffmpeg = new FFmpeg();

        abortController.signal.onabort = () => {
            ffmpeg.terminate();
            reject(new Error("Conversion aborted by user."));
        }

        try {
            await ffmpeg.load({
                coreURL: new URL("node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js", import.meta.url).toString(),
                wasmURL: new URL("node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm", import.meta.url).toString(),
                classWorkerURL: new URL("node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js", import.meta.url).toString(),
            });
        }
        catch (err) {
            return reject(new Error(`Failed to load FFmpeg: ${err instanceof Error ? err.message : String(err)}`));
        }

        const filePath = `dynamic_convert\\${file.name}`.replace(/  */g, '_');

        const convertedFilePath = filePath.replace(/\.[^/.]+$/, fileExtension[0]);

        const precmds = formatCommands[name];

        if (!precmds) {
            return reject(new Error(`No conversion command found for format "${name}".`));
        }

        ffmpeg.on("log", (e) => {
            logPrinter(e.message);
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

            await ffmpeg.exec(cmds.split(/ /));

            const convertedFile = await ffmpeg.readFile(convertedFilePath)
                .then((d) => new Blob([d], { type: mimeType }));

            resolve(convertedFile);
        }
        catch (err) {
            console.error("Error during conversion:", err);
            reject(new Error(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`));
        }

        ffmpeg.terminate();

    });

}

export default {
    SUPPORTED_DYNAMIC_FORMATS,
    SUPPORTED_STATIC_FORMATS,
    StaticConvert,
    DynamicConvert,
    DynamicPreprocess
}