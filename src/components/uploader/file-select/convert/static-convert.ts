import type { FileConvertContext } from "components/uploader/file-select/convert/ctx";
import { FORMATS } from "services/converter/file-formats";
import { toast } from "sonner";

export default async function (ctx: FileConvertContext) {
  const {
    hostingService,
    transcodeLogs,
    translation,
    pendingToastIds,
    fileConverter,
    file,
    imageFile,
    sourceFormat,
  } = ctx;

  const { t } = translation;

  const transcode = transcodeLogs.add();
  const LogMessage = (msg: string) => transcodeLogs.println(msg);

  const transcodeToastId = toast(t("uploader.file.notifiaction.transcoding"), {
    action: {
      label: t("main.abort"),
      onClick: () => transcode.abortController.abort(),
    },
    duration: Number.POSITIVE_INFINITY,
  });

  pendingToastIds.add(transcodeToastId);

  if (hostingService.SupportedStaticFormats.includes(sourceFormat.name)) {
    const previewFile = await fileConverter.GenerateStaticImagePreview(
      transcode.abortController,
      file,
      sourceFormat,
      LogMessage,
    );

    imageFile.SetPreviewFile(previewFile, FORMATS.PNG);
  } else {
    const targetFormatName = hostingService.SupportedStaticFormats[0];
    const targetFormat = FORMATS[targetFormatName];

    const [processesFile, previewFile] = await Promise.all([
      fileConverter.ConvertStaticImage(
        transcode.abortController,
        file,
        targetFormat,
        LogMessage,
      ),
      fileConverter.GenerateStaticImagePreview(
        transcode.abortController,
        file,
        sourceFormat,
        LogMessage,
      ),
    ]);

    if (processesFile.size === 0) {
      throw new Error("fail");
    }

    imageFile.SetProcessedFile(processesFile, targetFormat);
    imageFile.SetPreviewFile(previewFile, FORMATS.PNG);
  }

  transcode.done();
  toast.dismiss(transcodeToastId);
  pendingToastIds.delete(transcodeToastId);
}
