import { UseTranslationResponse } from "react-i18next";
import MessageManager, { Message } from "structs/message";
import TranscodeLogs from "components/uploader/transcode-logs";
import Converter from "services/converter";
import { ImageFile, ImageHostingService } from "services/image-hosting-services";
import { FileFormat } from "services/converter/file-formats";

export interface ConvertedFile {
    imageFile: ImageFile
    isAnimation: boolean
}

export interface FileSelectContext {
    translation: UseTranslationResponse<"translation", undefined>,
    notifications: MessageManager
    alerts: MessageManager
    fileConverter: Converter
    hostingService: ImageHostingService
    transcodeLogs: TranscodeLogs
    file: File
    messages: Map<string, Message>
}

export interface FileConvertContext extends FileSelectContext {
    sourceFormat: FileFormat
    imageFile: ImageFile
}