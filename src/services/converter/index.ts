import { FileFormat, FormatNames, FORMATS, LogPrinter } from "services/converter/file-formats";
import ImageCanvasConverter from "services/converter/canvas-converter";
import FFmpegService, { ConvertedFile } from "services/converter/ffmpeg";
import Imgproc from "services/converter/imgproc";

const STATIC_IMAGE_FORMATS: FormatNames[] = [
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

const ANIMATED_IMAGE_FORMATS: FormatNames[] = [
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

export default class FileConverter {
  public static readonly SUPPORTED_FORMATS = FORMATS;

  /**
   * Infers the file format based on its MIME type and file name extension.
   *
   * @param file The file for which to infer the format.
   * @returns The inferred FileFormat if successful, otherwise undefined.
   */
  public static InferFileFormat(file: File): FileFormat | undefined {
    const lowerCaseMimeType = file.type.toLowerCase();
    const lowerCaseFileName = file.name.toLowerCase();

    for (const format of Object.values(FORMATS)) {
      if (lowerCaseMimeType === format.mimeType) {
        return format;
      }

      for (const extension of format.fileExtension) {
        if (lowerCaseFileName.endsWith(extension)) {
          return format;
        }
      }
    }
    console.error(`Error: Could not determine the file format for "${file.name}".`);
    return undefined;
  }

  /**
   * Formats a file size in bytes into a human-readable string with specified decimal places.
   *
   * @param bytes The file size in bytes.
   * @param decimals The number of decimal places to display (default is 2).
   * @returns A string representing the formatted file size.
   * @throws Error if the provided byte size is negative.
   */
  public static FormatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes < 0) {
      throw new Error("Error: File size cannot be a negative value.");
    }

    const sizeUnits = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    if (bytes === 0) {
      return `0 ${sizeUnits[0]}`;
    }

    const kilobyte = 1024;
    const exponent = Math.floor(Math.log(bytes) / Math.log(kilobyte));
    const formattedSize = parseFloat((bytes / Math.pow(kilobyte, exponent)).toFixed(decimals));

    return `${formattedSize} ${sizeUnits[exponent]}`;
  }

  /**
   * Detects if a given file is an animated image.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The file to check for animation.
   * @param logMessage An object with a print method for logging messages.
   * @returns A promise that resolves to true if the file is animated, and false otherwise.
   * @throws Error if the source file format cannot be identified or if animation detection fails.
   */
  public async DetectAnimation(abortController: AbortController, file: File, logMessage: LogPrinter): Promise<boolean> {
    const sourceFormat = FileConverter.InferFileFormat(file);

    if (!sourceFormat) {
      throw new Error("Error: Failed to identify the source file format. Please ensure the file is valid and has a recognizable extension.");
    }

    if (STATIC_IMAGE_FORMATS.includes(sourceFormat.name)) {
      return false;
    }

    if (ANIMATED_IMAGE_FORMATS.includes(sourceFormat.name)) {
      return true;
    }

    if (Imgproc.IsSupportedDetectAnimation(sourceFormat)) {
      try {
        const imgproc = new Imgproc(abortController, logMessage);
        const { isAnimation } = await imgproc.DetectAnimation(file, sourceFormat);
        return isAnimation;
      } catch (error) {
        console.error("Error during animation detection:", error);
        throw new Error("Error: Failed to detect animation. Please try again with a different file or check the console for details.");
      }
    }

    throw new Error(`Error: Unable to determine animation status for format "${sourceFormat.name}". This format might not be supported for animation detection.`);
  }

  /**
   * Converts a static image file to the specified target format.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The input file to be converted.
   * @param targetFormat The desired output file format.
   * @param logMessage An object with a print method for logging conversion progress.
   * @returns A promise that resolves to the converted File object.
   * @throws Error if the source file format cannot be identified or if the conversion process fails.
   */
  public async ConvertStaticImage(abortController: AbortController, file: File, targetFormat: FileFormat, logMessage: LogPrinter): Promise<File> {
    const sourceFormat = FileConverter.InferFileFormat(file);

    if (!sourceFormat) {
      throw new Error("Error: Failed to identify the source file format. Please ensure the file is valid and has a recognizable extension.");
    }

    if (ImageCanvasConverter.IsSupported(sourceFormat, targetFormat)) {
      try {
        return await ImageCanvasConverter.ConvertImage(file, targetFormat);
      } catch (error) {
        console.error(`Error during canvas conversion to "${targetFormat.name}":`, error);
        throw new Error(`Error: Failed to convert image using canvas to "${targetFormat.name}". Please try again.`);
      }
    }

    if (Imgproc.IsSupportedDecodeStaticImage(sourceFormat)) {
      try {
        const imgproc = new Imgproc(abortController, logMessage);

        const { decodedFile } = await imgproc.DecodeStaticImage(file, sourceFormat);
        if (targetFormat.name === FORMATS["PNG"].name) {
          return decodedFile;
        } else {
          file = decodedFile;
        }
      } catch (error) {
        console.error("Error during extended static conversion:", error);
        throw new Error(`Error: Failed to perform intermediate conversion for "${sourceFormat.name}". Please try again.`);
      }
    }

    if (!FFmpegService.SUPPORTED_STATIC_FORMATS.includes(targetFormat.name)) {
      throw new Error(`Error: The target format "${targetFormat.name}" is not supported for static image conversion. Please choose a different format.`);
    }

    try {
      const blob = await FFmpegService.ConvertStatic(abortController, file, targetFormat, logMessage);
      const { mimeType, fileExtension } = targetFormat;
      return new File([blob], file.name.replace(/\.[^/.]+$/, `.${fileExtension[0]}`), { type: mimeType });
    } catch (error) {
      console.error(`Error during FFmpeg static conversion to "${targetFormat.name}":`, error);
      throw new Error(`Error: Failed to convert image to "${targetFormat.name}". Please check the logs for more details.`);
    }
  }

  /**
   * Preprocesses an animated image file before conversion, if necessary.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The input animated image file.
   * @param sourceFormat The format of the input file.
   * @param targetFormat The desired output file format.
   * @param logMessage An object with a print method for logging conversion progress.
   * @returns A promise that resolves to the preprocessed ConvertedFile object, or undefined if no preprocessing is needed.
   * @throws Error if the target format is not supported for animation conversion.
   */
  public async PreprocessAnimation(abortController: AbortController, file: File, sourceFormat: FileFormat, targetFormat: FileFormat, logMessage: LogPrinter): Promise<ConvertedFile | undefined> {
    if (Imgproc.IsSupportedConvertAnimatedImage(sourceFormat, targetFormat)) {
      return undefined;
    }

    if (!FFmpegService.SUPPORTED_ANIMATION_FORMATS.includes(targetFormat.name)) {
      throw new Error(`Error: The target format "${targetFormat.name}" is not supported for animation content conversion. Please choose a different format.`);
    }

    return await FFmpegService.PreprocessAnimation(
      abortController,
      file,
      sourceFormat,
      logMessage
    );
  }

  /**
   * Converts an animated image file to the specified target format.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The input file to convert.
   * @param sourceFormat The format of the input file.
   * @param targetFormat The desired output file format.
   * @param extractFirstFrame A boolean indicating whether to extract the first frame as a separate file.
   * @param logMessage An object with a print method for logging conversion progress.
   * @returns A promise that resolves to an object containing the converted file and optionally the first frame.
   * @throws Error if the target format is not supported or if the conversion fails.
   */
  public async ConvertAnimatedImage(abortController: AbortController, file: File, sourceFormat: FileFormat, targetFormat: FileFormat, extractFirstFrame: boolean, logMessage: LogPrinter):
    Promise<{
      converted: {
        file: File;
        fileFormat: FileFormat;
      };
      firstFrame?: {
        file: File;
        fileFormat: FileFormat;
      };
    }> {

    if (Imgproc.IsSupportedConvertAnimatedImage(sourceFormat, targetFormat)) {
      try {
        const imgproc = new Imgproc(abortController, logMessage);
        return await imgproc.ConvertAnimatedImage(file, sourceFormat, targetFormat);
      } catch (error) {
        console.error(`Error during animated image conversion from "${sourceFormat.name}" to "${targetFormat.name}":`, error);
        throw new Error(`Error: Failed to convert animated image from "${sourceFormat.name}" to "${targetFormat.name}". Please try again.`);
      }
    }

    if (!FFmpegService.SUPPORTED_ANIMATION_FORMATS.includes(targetFormat.name)) {
      throw new Error(`Error: The target format "${targetFormat.name}" is not supported for animation content conversion. Please choose a different format.`);
    }

    try {
      return await FFmpegService.ConvertAnimation(abortController, file, targetFormat, extractFirstFrame, logMessage);
    } catch (error) {
      console.error(`Error during FFmpeg animation conversion to "${targetFormat.name}":`, error);
      throw new Error(`Error: Failed to convert to "${targetFormat.name}". Please check the logs for more details.`);
    }
  }

  /**
   * Generates a preview image (PNG format) for a static image file.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The input static image file.
   * @param format The format of the input file.
   * @param logMessage An object with a print method for logging conversion progress.
   * @returns A promise that resolves to a File object representing the PNG preview.
   * @throws Error if the preview generation fails.
   */
  public async GenerateStaticImagePreview(abortController: AbortController, file: File, format: FileFormat, logMessage: LogPrinter): Promise<File> {
    if (format.name === FORMATS["PNG"].name) {
      return file;
    }

    try {
      return await this.ConvertStaticImage(abortController, file, FORMATS["PNG"], logMessage);
    } catch (error) {
      console.error("Error during static image preview generation:", error);
      throw new Error("Error: Failed to generate static image preview.");
    }
  }

  /**
   * Generates a preview (first frame as PNG) for an animated image or video file.
   *
   * @param abortController An AbortController instance to allow for operation cancellation.
   * @param file The input animated image or video file.
   * @param sourceFormat The format of the input file.
   * @param logMessage An object with a print method for logging conversion progress.
   * @returns A promise that resolves to an object containing the first frame as a File and its format.
   * @throws Error if preview generation is not supported for the given format.
   */
  public async GenerateAnimatedImagePreview(abortController: AbortController, file: File, sourceFormat: FileFormat, logMessage: LogPrinter):
    Promise<{
      firstFrameFile: File;
      firstFrameFileFormat: FileFormat;
    }> {

    if (Imgproc.IsSupportedGetFirstFrame(sourceFormat)) {
      const imgproc = new Imgproc(abortController, logMessage);
      return await imgproc.GetFirstFrame(file, sourceFormat);
    }

    if (!FFmpegService.SUPPORTED_ANIMATION_FORMATS.includes(sourceFormat.name)) {
      throw new Error(`Error: Preview generation for the format "${sourceFormat.name}" is not supported.`);
    }

    return await FFmpegService.ExtractFirstFrameFromAnimation(abortController, file, logMessage);
  }
}