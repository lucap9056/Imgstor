import {
  faArrowUpRightFromSquare,
  faCopy,
  faDownload,
  faTrashCan,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import TranscodeLogs from "components/uploader/transcode-logs";
import { useConfirm } from "global-components/confirm-dialog";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import RoutePaths from "route-paths";
import Converter from "services/converter";
import { FORMATS } from "services/converter/file-formats";
import {
  ImageFile,
  type ImageHostingService,
} from "services/image-hosting-services";
import ImportExternal from "services/image-hosting-services/import-external";
import { useImgstor } from "services/imgstor";
import type { ImgstorImage } from "services/imgstor-db";
import { toast } from "sonner";
import Description from "./description";
import Header from "./header";
import Image from "./image";
import Options, { type Option } from "./options";
import styles from "./style.module.scss";
import Tags from "./tags";

const MainViewer: React.FC = () => {
  const loader = useLoader();
  const confirm = useConfirm();
  const imgstor = useImgstor();
  const { imageId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [image, SetImage] = useState<ImgstorImage | undefined>(() =>
    imageId
      ? imgstor.db.SearchImages({
          filters: { imageId },
          limit: 1,
        })[0]
      : undefined,
  );

  const transcodeLogs = new TranscodeLogs();

  const hostingService: ImageHostingService | undefined = image
    ? imgstor.availableHostingServices[image.hostingServiceId]
    : undefined;

  const HandleOpen = useCallback(() => {
    if (!image) return;

    const a = document.createElement("a");
    a.href = image.imageUrl;
    a.target = "_blank";
    a.click();
  }, [image]);

  const HandleCopyLink = useCallback(() => {
    if (!image) return;
    navigator.clipboard.writeText(image.imageUrl);

    toast.success(t("viewer.notification.link-copied"));
  }, [image, t]);

  const HandleDownload = useCallback(async () => {
    if (!image) return;

    if (image.fileId === "") {
      toast(t("viewer.notification.not-stored"));
      return;
    }

    const loading = loader.append();
    const downloadingToastId = toast.loading(t("viewer.alert.downloading"));
    try {
      const file = await imgstor.DownloadImage(image);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = image.name;
      a.target = "_blank";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error(t("viewer.notification.download-failed"));
    }
    loading.remove();
    toast.dismiss(downloadingToastId);
  }, [image, t, loader, imgstor]);

  const FileConvert = useCallback(
    async (file: File): Promise<ImageFile> => {
      if (!hostingService) {
        throw new Error();
      }

      const fileConverter = imgstor.converter;
      const LogMessage = (msg: string) => transcodeLogs.println(msg);

      const pendingToastIds: (string | number)[] = [];

      try {
        const sourceFormat = Converter.InferFileFormat(file);

        if (sourceFormat === undefined) {
          throw new Error("invalid format");
        }

        const animationDetecting = transcodeLogs.add();
        const animationDetectToastId = toast(
          t("uploader.file.notifiaction.aniation-detecting"),
          {
            action: {
              label: t("main.abort"),
              onClick: () => animationDetecting.abortController.abort(),
            },
            duration: Number.POSITIVE_INFINITY,
          },
        );

        const dynamic = await fileConverter.DetectAnimation(
          animationDetecting.abortController,
          file,
          LogMessage,
        );
        toast.dismiss(animationDetectToastId);
        animationDetecting.remove();

        const imageFile = new ImageFile(file, sourceFormat);

        if (dynamic) {
          if (
            !hostingService.SupportedAnimationFormats.includes(
              sourceFormat.name,
            )
          ) {
            const targetFormatName =
              hostingService.SupportedAnimationFormats[0];
            const targetFormat = FORMATS[targetFormatName];

            const transcode = transcodeLogs.add();

            const transcodeToastId = toast(
              t("uploader.file.notifiaction.transcoding"),
              {
                action: {
                  label: t("main.abort"),
                  onClick: () => transcode.abortController.abort(),
                },
                duration: Number.POSITIVE_INFINITY,
              },
            );

            pendingToastIds.push(transcodeToastId);

            const { converted, firstFrame } =
              await fileConverter.ConvertAnimatedImage(
                transcode.abortController,
                file,
                sourceFormat,
                targetFormat,
                true,
                LogMessage,
              );
            transcode.done();
            toast.dismiss(transcodeToastId);
            pendingToastIds.splice(
              pendingToastIds.indexOf(transcodeToastId),
              1,
            );
            if (converted.file.size === 0) {
              throw new Error("fail");
            }

            imageFile.SetProcessedFile(converted.file, converted.fileFormat);

            if (firstFrame) {
              imageFile.SetPreviewFile(firstFrame.file, firstFrame.fileFormat);
            }
          }
        } else {
          if (
            !hostingService.SupportedStaticFormats.includes(sourceFormat.name)
          ) {
            const targetFormatName = hostingService.SupportedStaticFormats[0];
            const targetFormat = FORMATS[targetFormatName];

            const transcode = transcodeLogs.add();
            const transcodeToastId = toast(
              t("uploader.file.notifiaction.transcoding"),
              {
                action: {
                  label: t("main.abort"),
                  onClick: () => transcode.abortController.abort(),
                },
                duration: Number.POSITIVE_INFINITY,
              },
            );

            pendingToastIds.push(transcodeToastId);
            const processesFile = await fileConverter.ConvertStaticImage(
              transcode.abortController,
              file,
              targetFormat,
              LogMessage,
            );
            transcode.done();
            toast.dismiss(transcodeToastId);
            pendingToastIds.splice(
              pendingToastIds.indexOf(transcodeToastId),
              1,
            );
            if (processesFile.size === 0) {
              throw new Error("fail");
            }
            imageFile.SetProcessedFile(processesFile, targetFormat);
          }
        }

        if (imageFile.processed) {
          const originalSize = Converter.InferFileFormat(
            imageFile.original.file,
          );
          const processedSize = Converter.InferFileFormat(
            imageFile.processed.file,
          );

          toast(
            t("uploader.file.notifiaction.converted-size", {
              originalSize,
              processedSize,
            }),
            {
              action: {
                label: t("main.confirm"),
                onClick: () => transcodeLogs.clear(),
              },
              duration: Number.POSITIVE_INFINITY,
            },
          );
        } else if (transcodeLogs.visibled) {
          transcodeLogs.clear();
        }

        return imageFile;
      } catch (err) {
        LogMessage((err as Error).message);
        for (const id of pendingToastIds) {
          toast.dismiss(id);
        }
        pendingToastIds.length = 0;

        toast.error((err as Error).message, {
          action: {
            label: t("main.confirm"),
            onClick: () => transcodeLogs.clear(),
          },
          duration: Number.POSITIVE_INFINITY,
        });

        throw err;
      }
    },
    [hostingService, imgstor, t, transcodeLogs],
  );

  const HandleReupload = useCallback(() => {
    if (!image) return;

    if (hostingService === undefined || !hostingService.isEnabled) {
      return;
    }

    if (image.fileId === "") {
      toast(t("viewer.notification.not-stored"));
      return;
    }

    confirm({
      description: t("viewer.alert.reupload"),
      buttons: [
        { label: t("main.cancel") },
        {
          label: t("main.confirm"),
          variant: "primary",
          onClick: async () => {
            if (!hostingService) {
              return;
            }

            try {
              const [file] = await Promise.all([
                imgstor.DownloadImage(image),
                hostingService.Delete(image),
              ]);

              const convertedFile = await FileConvert(file);

              convertedFile.title = image.title;
              convertedFile.description = image.description;

              const uploadedImage = await hostingService.Upload(
                true,
                convertedFile,
              );

              imgstor.db.UpdateImage({
                ...uploadedImage,
                imageId: image.imageId,
                fileId: image.fileId,
              });
              await imgstor.db.Save();

              SetImage(uploadedImage);
            } catch (err) {
              toast.error((err as Error).message);
            }
          },
        },
      ],
    });
  }, [image, hostingService, imgstor, confirm, t, FileConvert]);

  if (!imageId || !image) {
    return null;
  }

  const Delete = async () => {
    const loading = loader.append();

    const removingToastId = toast.loading(t("viewer.notifiaction.deleting"));

    try {
      const hostingService =
        imgstor.availableHostingServices[image.hostingServiceId];
      if (hostingService && hostingService.NAME !== ImportExternal.NAME) {
        hostingService.Delete(image);
      }

      if (image.fileId !== "") {
        await imgstor.removeImage(image);
      }
      imgstor.db.DeleteImage(image.imageId);

      await imgstor.db.Save();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      loading.remove();
      toast.dismiss(removingToastId);
    }
  };

  const HandleDelete = () => {
    confirm({
      description: t("viewer.alert.delete"),
      buttons: [
        { label: t("main.cancel") },
        {
          label: t("main.confirm"),
          variant: "danger",
          onClick: async () => {
            await Delete();
            navigate(RoutePaths.HOME);
          },
        },
      ],
    });
  };

  const options: Option[] = [
    {
      key: "delete",
      text: t("viewer.option.delete"),
      node: <FontAwesomeIcon icon={faTrashCan} />,
      handler: HandleDelete,
    },
    {
      key: "open",
      text: t("viewer.option.open"),
      node: <FontAwesomeIcon icon={faArrowUpRightFromSquare} />,
      handler: HandleOpen,
    },
    {
      key: "copy-link",
      text: t("viewer.option.copy-link"),
      node: <FontAwesomeIcon icon={faCopy} />,
      handler: HandleCopyLink,
    },
  ];

  if (image.fileId !== "") {
    options.push({
      key: "download",
      text: t("viewer.option.download"),
      node: <FontAwesomeIcon icon={faDownload} />,
      handler: HandleDownload,
    });

    if (hostingService?.isEnabled) {
      options.push({
        key: "reupload",
        text: t("viewer.option.reupload"),
        node: <FontAwesomeIcon icon={faUpload} />,
        handler: HandleReupload,
      });
    }
  }

  return (
    <div className={styles.viewer}>
      <Header image={image} />
      <Image image={image} />
      <Options options={options} />
      <Description image={image} />
      <Tags image={image} />
      <TranscodeLogs.Component transcodeLogs={transcodeLogs} />
    </div>
  );
};

export default MainViewer;
