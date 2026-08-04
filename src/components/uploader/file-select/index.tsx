import ConvertFile from "components/uploader/file-select/convert";
import type { ConvertedFile } from "components/uploader/file-select/convert/ctx";
import styles from "components/uploader/style.module.scss";
import type TranscodeLogs from "components/uploader/transcode-logs";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type Converter from "services/converter";
import type {
  ImageFile,
  ImageHostingService,
} from "services/image-hosting-services";
import { toast } from "sonner";

function FilesSelecter(): Promise<File> {
  return new Promise((resolve, reject) => {
    const fileSelecter = document.createElement("input");
    fileSelecter.type = "file";
    fileSelecter.accept = "image/*";
    fileSelecter.multiple = true;
    fileSelecter.onchange = () => {
      if (fileSelecter.files === null) {
        return reject(new Error("not select file"));
      }
      const file: File = fileSelecter.files[0];
      resolve(file);
    };
    fileSelecter.onerror = reject;
    fileSelecter.click();
  });
}

interface Props {
  fileConverter: Converter;
  hostingService: ImageHostingService;
  transcodeLogs: TranscodeLogs;
  onchange: (image: ImageFile | undefined) => void;
}

const FileSelect: React.FC<Props> = ({
  fileConverter,
  hostingService,
  transcodeLogs,
  onchange,
}) => {
  const translation = useTranslation();
  const { t } = translation;
  const [dragActive, SetDragActive] = useState(false);
  const [selectedFile, SetSelectedFile] = useState<ConvertedFile>();
  const [previewImageUrl, SetPreviewImageUrl] = useState<string>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: must run only when selectedFile changes; adding previewImageUrl (which this effect itself sets) would revoke/recreate the object URL in an infinite loop, and onchange re-fires on unrelated parent re-renders
  useEffect(() => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    if (selectedFile) {
      onchange(selectedFile.imageFile);

      const { preview } = selectedFile.imageFile;

      if (preview) {
        const url = URL.createObjectURL(preview.file);
        SetPreviewImageUrl(url);
      }
    }
  }, [selectedFile]);

  const HandleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      SetDragActive(true);
    } else if (e.type === "dragleave") {
      SetDragActive(false);
    }
  };

  const SelectFile = (file: File) => {
    const pendingToastIds = new Set<string | number>();

    ConvertFile({
      translation,
      fileConverter,
      hostingService,
      transcodeLogs,
      file,
      pendingToastIds,
    })
      .then(SetSelectedFile)
      .catch((err: Error) => {
        transcodeLogs.println(
          `An error occurred during file selection and processing: ${err.message}`,
        );

        for (const id of pendingToastIds) {
          toast.dismiss(id);
        }
        pendingToastIds.clear();

        toast.error(
          t("uploader.file.error.processing", { message: err.message }),
          {
            action: {
              label: t("main.confirm"),
              onClick: () => transcodeLogs.clear(),
            },
            duration: Number.POSITIVE_INFINITY,
          },
        );
      });
  };

  const HandleDrop = async (
    e: React.DragEvent<HTMLDivElement | HTMLImageElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    SetDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      SelectFile(e.dataTransfer.files[0]);
    }
  };

  const HandleSelectFile = async () => {
    const file = await FilesSelecter();
    SelectFile(file);
  };

  const HandleRemoveImage = () => {
    if (previewImageUrl !== undefined) {
      URL.revokeObjectURL(previewImageUrl);
    }
    SetPreviewImageUrl(undefined);
    SetSelectedFile(undefined);
  };

  if (selectedFile === undefined) {
    return (
      <div
        className={styles.upload_image}
        data-active={dragActive}
        onDragEnter={HandleDrag}
        onDragLeave={HandleDrag}
        onDragOver={HandleDrag}
        onDrop={HandleDrop}
      >
        <p>{t("uploader.file.drag")}</p>
        <button
          type="button"
          className={styles.upload_seelct_file}
          onClick={HandleSelectFile}
        >
          {t("uploader.file.select")}
        </button>
      </div>
    );
  }

  const PreviewImageLoad = (e: React.UIEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    selectedFile.imageFile.SetImageSize(width, height);
  };

  return (
    <div className={styles.upload_image_selected}>
      {previewImageUrl ? (
        <img src={previewImageUrl} alt="" onLoad={PreviewImageLoad} />
      ) : (
        <div>{t("uploader.file.preview.not-supported")}</div>
      )}
      <button
        type="button"
        className={styles.upload_remove}
        onClick={HandleRemoveImage}
      >
        {t("uploader.file.remove")}
      </button>
    </div>
  );
};

export default FileSelect;
