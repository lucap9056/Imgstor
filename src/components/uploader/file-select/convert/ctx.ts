import type TranscodeLogs from "components/uploader/transcode-logs";
import type { UseTranslationResponse } from "react-i18next";
import type Converter from "services/converter";
import type { FileFormat } from "services/converter/file-formats";
import type {
  ImageFile,
  ImageHostingService,
} from "services/image-hosting-services";
import type MessageManager from "structs/message";
import type { Message } from "structs/message";

export interface ConvertedFile {
  imageFile: ImageFile;
  isAnimation: boolean;
}

export interface FileSelectContext {
  translation: UseTranslationResponse<"translation", undefined>;
  notifications: MessageManager;
  alerts: MessageManager;
  fileConverter: Converter;
  hostingService: ImageHostingService;
  transcodeLogs: TranscodeLogs;
  file: File;
  messages: Map<string, Message>;
}

export interface FileConvertContext extends FileSelectContext {
  sourceFormat: FileFormat;
  imageFile: ImageFile;
}
