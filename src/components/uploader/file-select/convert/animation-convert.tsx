import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { FileConvertContext } from "components/uploader/file-select/convert/ctx";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { FORMATS, type FormatNames } from "services/converter/file-formats";
import { toast } from "sonner";

import styles from "./style.module.scss";

interface SelectFormatProps {
  formats: FormatNames[];
  update: (format: FormatNames) => void;
}

const SelectFormat: React.FC<SelectFormatProps> = ({ formats, update }) => {
  const [format, SetFormat] = useState(formats[0]);
  const [visible, SetVisible] = useState(false);

  useEffect(() => {
    SetVisible(false);
    update(format);
  }, [format, update]);

  const Visible = () => {
    SetVisible(true);
  };

  return (
    <>
      <span className={styles.current_format} onClick={Visible}>
        {format}
      </span>
      {visible && (
        <ul className={styles.format_list}>
          {formats.map((name) => (
            <li
              className={styles.format}
              key={name}
              onClick={() => SetFormat(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

interface ConvertConfirmDialogProps {
  formats: FormatNames[];
  onCancel: () => void;
  onConfirm: (format: FormatNames) => void;
}

const ConvertConfirmDialog: React.FC<ConvertConfirmDialogProps> = ({
  formats,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<FormatNames>(formats[0]);

  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.dialog_overlay} />
        <AlertDialog.Content className={styles.dialog_content}>
          <AlertDialog.Description className={styles.message}>
            {t("uploader.file.alert.converter.animation")}
            <br />
            {t("uploader.file.alert.converter.animation.ex")}
            <br />
            {t("uploader.file.alert.converter.animation.target")}{" "}
            <SelectFormat formats={formats} update={setFormat} />
          </AlertDialog.Description>
          <div className={styles.dialog_buttons}>
            <button
              type="button"
              className={styles.dialog_button}
              onClick={onCancel}
            >
              {t("main.cancel")}
            </button>
            <button
              type="button"
              className={styles.dialog_button}
              data-variant="primary"
              onClick={() => onConfirm(format)}
            >
              {t("main.confirm")}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

function ShowFormatConfirmDialog(
  formats: FormatNames[],
): Promise<FormatNames | undefined> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const close = (format: FormatNames | undefined) => {
      root.unmount();
      container.remove();
      resolve(format);
    };

    root.render(
      <ConvertConfirmDialog
        formats={formats}
        onCancel={() => close(undefined)}
        onConfirm={(format) => close(format)}
      />,
    );
  });
}

export default async function (ctx: FileConvertContext): Promise<void> {
  const { hostingService, translation, sourceFormat } = ctx;

  const { t } = translation;

  const hostingServiceSupported =
    hostingService.SupportedAnimationFormats.includes(sourceFormat.name);
  console.log("Hosting service supported: ", hostingServiceSupported);

  if (hostingServiceSupported) {
    await OnlyConvertPreviewImage(ctx);
  } else {
    const targetFormat = await ShowFormatConfirmDialog(
      hostingService.SupportedAnimationFormats,
    );

    if (targetFormat === undefined) {
      throw new Error(t("uploader.notification.converter.cancel"));
    }

    await ConfirmConvert(ctx, targetFormat);
  }
}

async function ConfirmConvert(
  ctx: FileConvertContext,
  targetFormatName: FormatNames,
) {
  const {
    transcodeLogs,
    translation,
    pendingToastIds,
    fileConverter,
    file,
    imageFile,
    sourceFormat,
  } = ctx;

  const { t } = translation;

  const targetFormat = FORMATS[targetFormatName];

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

  const preprocessed = await fileConverter.PreprocessAnimation(
    transcode.abortController,
    file,
    sourceFormat,
    targetFormat,
    LogMessage,
  );

  if (preprocessed) {
    const { file, fileFormat } = preprocessed.firstFrame;
    imageFile.SetPreviewFile(file, fileFormat);
  }

  const { converted, firstFrame } = preprocessed
    ? await fileConverter.ConvertAnimatedImage(
        transcode.abortController,
        preprocessed.converted.file,
        preprocessed.converted.fileFormat,
        targetFormat,
        false,
        LogMessage,
      )
    : await fileConverter.ConvertAnimatedImage(
        transcode.abortController,
        file,
        sourceFormat,
        targetFormat,
        true,
        LogMessage,
      );

  if (firstFrame) {
    const { file, fileFormat } = firstFrame;
    imageFile.SetPreviewFile(file, fileFormat);
  }

  transcode.done();
  toast.dismiss(transcodeToastId);
  pendingToastIds.delete(transcodeToastId);

  if (converted.file.size === 0) {
    throw new Error("fail");
  }
  imageFile.SetProcessedFile(converted.file, converted.fileFormat);
}

async function OnlyConvertPreviewImage(ctx: FileConvertContext) {
  const {
    file,
    imageFile,
    sourceFormat,
    pendingToastIds,
    fileConverter,
    transcodeLogs,
    translation,
  } = ctx;

  console.log("Only convert preview iamge");

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

  const { firstFrameFile, firstFrameFileFormat } =
    await fileConverter.GenerateAnimatedImagePreview(
      transcode.abortController,
      file,
      sourceFormat,
      LogMessage,
    );

  imageFile.SetPreviewFile(firstFrameFile, firstFrameFileFormat);

  transcode.done();
  toast.dismiss(transcodeToastId);
  pendingToastIds.delete(transcodeToastId);
}
