import type TranscodeLogs from "components/uploader/transcode-logs";
import type { UseTranslationResponse } from "react-i18next";
import type Converter from "services/converter";
import type { FileFormat } from "services/converter/file-formats";
import type {
  ImageFile,
  ImageHostingService,
} from "services/image-hosting-services";

export interface ConvertedFile {
  imageFile: ImageFile;
  isAnimation: boolean;
}

export interface FileSelectContext {
  translation: UseTranslationResponse<"translation", undefined>;
  fileConverter: Converter;
  hostingService: ImageHostingService;
  transcodeLogs: TranscodeLogs;
  file: File;
  /** Toast ids for still-open progress toasts, so callers can clean them up on failure. */
  pendingToastIds: Set<string | number>;
}

export interface FileConvertContext extends FileSelectContext {
  sourceFormat: FileFormat;
  imageFile: ImageFile;
}
