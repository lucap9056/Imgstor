import FileSelect from "components/uploader/file-select";
import HostingServiceSelect from "components/uploader/hosting-service-select";
import ImportExternalComponent from "components/uploader/import-external";
import TagsSelect from "components/uploader/tags-select";
import TranscodeLogs from "components/uploader/transcode-logs";
import { useConfirm } from "global-components/confirm-dialog";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import RoutePaths from "route-paths";
import type {
  ImageFile,
  ImageHostingService,
} from "services/image-hosting-services";
import ImportExternal from "services/image-hosting-services/import-external";
import Local from "services/image-hosting-services/local";
import { useImgstor } from "services/imgstor";
import type { ImgstorTag } from "services/imgstor-db";
import { toast } from "sonner";

import styles from "./style.module.scss";

const Uploader: React.FC = () => {
  const loader = useLoader();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const imgstor = useImgstor();
  const [selectedFile, SetSelectedFile] = useState<ImageFile>();
  const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>([]);
  const [transcodeLogs] = useState<TranscodeLogs>(new TranscodeLogs());
  const [imageHostingService, SetImageHostingService] =
    useState<ImageHostingService>();
  const [save, SetSave] = useState(true);
  const navigate = useNavigate();

  const FOR_ID = {
    TITLE: useId(),
    DESCRIPTION: useId(),
  };

  const LocalUploadImage = (file: ImageFile) => {
    const a = document.createElement("a");
    const f = (file.processed || file.original).file;
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ImportExternalImage = async (
    hostingService: ImageHostingService,
    file: ImageFile,
  ) => {
    const image = await hostingService.Upload(save, file);
    const imageId = imgstor.db.InsertImage(image);
    for (const { tagId } of selectedTags) {
      imgstor.db.InsertImageTag(imageId, tagId);
    }

    const savingToastId = toast.loading(t("uploader.notification.saving"));
    try {
      await imgstor.db.Save();
    } catch {
      toast.error(t("uploader.notification.save-failed"));
    }
    toast.dismiss(savingToastId);

    toast.success(t("uploader.notification.uploaded"), {
      action: {
        label: t("main.confirm"),
        onClick: () => navigate(RoutePaths.HOME),
      },
      duration: Number.POSITIVE_INFINITY,
    });
  };

  const DefaultUploadImage = async (
    hostingService: ImageHostingService,
    file: ImageFile,
  ) => {
    const image = await hostingService.Upload(save, file);

    if (save) {
      const imageId = await imgstor
        .appendImage(image, file.original.file)
        .then((img) => imgstor.db.InsertImage(img));

      for (const { tagId } of selectedTags) {
        imgstor.db.InsertImageTag(imageId, tagId);
      }

      try {
        await imgstor.db.Save();
      } catch {
        toast.error(t("uploader.notification.save-failed"));
      }

      confirm({
        description: t("uploader.notification.uploaded"),
        buttons: [
          {
            label: t("uploader.copy-link"),
            keepOpen: true,
            onClick: () => {
              navigator.clipboard.writeText(image.imageUrl);
              toast.success(t("uploader.notification.link-copied"));
            },
          },
          {
            label: t("main.confirm"),
            variant: "primary",
            onClick: () => navigate(RoutePaths.HOME),
          },
        ],
      });
    } else {
      confirm({
        description: t("uploader.notification.uploaded"),
        buttons: [
          {
            label: t("main.delete"),
            variant: "danger",
            onClick: () => {
              hostingService.Delete(image);
              navigate(RoutePaths.HOME);
            },
          },
          {
            label: t("uploader.copy-link"),
            keepOpen: true,
            onClick: () => {
              navigator.clipboard.writeText(image.imageUrl);
              toast.success(t("uploader.notification.link-copied"));
            },
          },
          {
            label: t("main.confirm"),
            variant: "primary",
            onClick: () => navigate(RoutePaths.HOME),
          },
        ],
      });
    }
  };

  const ConfirmUploadImage = async (form: FormData, file: ImageFile) => {
    if (!imageHostingService) {
      return;
    }

    const loading = loader.append();

    const uploadingToastId = toast.loading(
      t("uploader.notification.uploading"),
    );

    file.title = (form.get("title") || "").toString();
    file.description = (form.get("description") || "").toString();

    try {
      switch (imageHostingService.NAME) {
        case Local.NAME: {
          LocalUploadImage(file);
          break;
        }
        case ImportExternal.NAME: {
          await ImportExternalImage(imageHostingService, file);
          break;
        }

        default:
          await DefaultUploadImage(imageHostingService, file);
          break;
      }
    } catch (err) {
      toast.error((err as Error).message);
    }

    loading.remove();
    toast.dismiss(uploadingToastId);
  };

  const HandleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFile) return;

    const file = selectedFile.original.file;

    if (!file) return;

    const form = new FormData(e.target as HTMLFormElement);

    confirm({
      description: t("uploader.alert.upload"),
      buttons: [
        { label: t("main.cancel") },
        {
          label: t("main.confirm"),
          variant: "primary",
          onClick: () => ConfirmUploadImage(form, selectedFile),
        },
      ],
    });
  };

  const HandleCancel = () => {
    SetSelectedFile(undefined);
    navigate(RoutePaths.HOME);
  };

  const HandleSelectImage = (file?: ImageFile) => {
    SetSelectedFile(file);
  };

  const HandleSelectTags = (tags: ImgstorTag[]) => {
    SetSelectedTags(tags);
  };

  const HandleSetSave = () => {
    SetSave(!save);
  };

  return (
    <div className={styles.uploader_container}>
      <form
        className={styles.uploader}
        onReset={HandleCancel}
        onSubmit={HandleUpload}
      >
        <label>{t("uploader.label.hosting-service")}</label>
        <HostingServiceSelect
          imgstor={imgstor}
          onchange={SetImageHostingService}
        />

        {imageHostingService && (
          <>
            {imageHostingService.features.description && (
              <>
                <label htmlFor={FOR_ID.TITLE}>
                  {t("uploader.label.title")}
                </label>
                <input
                  id={FOR_ID.TITLE}
                  className={styles.upload_title}
                  type="text"
                  name="title"
                  autoComplete="off"
                />
              </>
            )}

            {imageHostingService.features.file ? (
              <FileSelect
                fileConverter={imgstor.converter}
                onchange={HandleSelectImage}
                hostingService={imageHostingService}
                transcodeLogs={transcodeLogs}
              />
            ) : (
              <ImportExternalComponent onchange={HandleSelectImage} />
            )}

            {imageHostingService.features.description && (
              <>
                <label htmlFor={FOR_ID.DESCRIPTION}>
                  {t("uploader.label.description")}
                </label>
                <textarea
                  id={FOR_ID.DESCRIPTION}
                  className={styles.upload_description}
                  name="description"
                  autoComplete="off"
                />
              </>
            )}

            {imageHostingService.features.save && (
              <div className={styles.upload_save}>
                <div className={styles.upload_save_label}>
                  {t("uploader.label.select-save")}
                </div>
                <div
                  className={styles.upload_save_value}
                  data-enabled={save}
                  onClick={HandleSetSave}
                ></div>
              </div>
            )}

            {save && imageHostingService.features.tags && (
              <TagsSelect imgstor={imgstor} onchange={HandleSelectTags} />
            )}
          </>
        )}

        <div className={styles.options}>
          <button type="reset" className={styles.upload_cancel}>
            {t("main.back")}
          </button>
          {selectedFile && (
            <button type="submit" className={styles.upload_submit}>
              {t("main.post")}
            </button>
          )}
        </div>
      </form>
      <TranscodeLogs.Component transcodeLogs={transcodeLogs} />
    </div>
  );
};

export default Uploader;
