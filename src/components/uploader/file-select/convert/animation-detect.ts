import type { FileSelectContext } from "components/uploader/file-select/convert/ctx";
import { toast } from "sonner";

/**
 * Detects if a given file is an animated image. It displays a notification during the detection process
 * with an option to abort.
 * @async
 * @param {FileSelectContext} context - The context object containing necessary dependencies for file processing.
 * @returns {Promise<boolean>} - A promise that resolves to true if the file is animated, and false otherwise.
 */
export default async function DetectAnimation(
  context: FileSelectContext,
): Promise<boolean> {
  const { translation, transcodeLogs, fileConverter, file } = context;

  const { t } = translation;

  const detectingLog = transcodeLogs.add();
  const LogMessage = (msg: string) => transcodeLogs.println(msg);

  const detectingToastId = toast(
    t("uploader.file.notification.animation-detecting"),
    {
      action: {
        label: t("main.abort"),
        onClick: () => detectingLog.abortController.abort(),
      },
      duration: Number.POSITIVE_INFINITY,
    },
  );

  const isAnimated = await fileConverter.DetectAnimation(
    detectingLog.abortController,
    file,
    LogMessage,
  );
  toast.dismiss(detectingToastId);
  detectingLog.remove();

  return isAnimated;
}
