import Block from "components/settings/blocks";
import HostingService from "components/settings/page/storage/hosting-service-version";
import styles from "components/settings/page/style.module.scss";
import { useConfirm } from "global-components/confirm-dialog";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import RoutePaths from "route-paths";
import { useImgstor } from "services/imgstor";
import { toast } from "sonner";

const SettingStorage: React.FC = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const loader = useLoader();
  const imgstor = useImgstor();
  const [usedStorage, setUsedStorage] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const handleLoad = async () => {
    const loading = loader.append();

    const loadingToastId = toast.loading(t("settings.notification.load"));

    try {
      const usage = await imgstor.using;
      setUsedStorage(usage);
      setLoaded(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      toast.dismiss(loadingToastId);
      loading.remove();
    }
  };

  const handleExportHostingService = () => {
    const hostingServiceConfig = JSON.stringify(
      imgstor.settings.config.hostingServices,
    );
    const configFileContent = new Blob([hostingServiceConfig]);
    const configFileName = "hostingServiceConfig.json";
    const configFile = new File([configFileContent], configFileName, {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.download = configFileName;
    a.href = URL.createObjectURL(configFile);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImportHostingService = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*.json";
    input.onchange = () => {
      if (!input.files) {
        throw new Error("");
      }
      const file = input.files[0];

      const reader = new FileReader();
      reader.onload = async () => {
        const loading = loader.append();
        try {
          const content = (reader.result || "").toString();
          const hostingServices = HostingService.ensureVersion(content);
          await imgstor.settings.saveConfig({
            ...imgstor.settings.config,
            hostingServices,
          });
        } catch (err) {
          console.log(err);
        }

        loading.remove();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    confirm({
      description: t("settings.storage.alert.clear"),
      buttons: [
        { label: t("main.cancel") },
        {
          label: t("main.confirm"),
          variant: "danger",
          onClick: async () => {
            const loading = loader.append();
            const clearingToastId = toast.loading(
              t("settings.storage.notification.clearing"),
            );

            try {
              await imgstor.clear();
              toast.success(t("settings.sotorage.notification.cleared"));

              location.hash = "";
              location.reload();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              loading.remove();
              toast.dismiss(clearingToastId);
            }
          },
        },
      ],
    });
  };

  const handleBack = () => {
    navigate(RoutePaths.SETTINGS);
  };

  return (
    <div className={styles.settings_page}>
      <div className={styles.settings_page_main}>
        <Block
          title={t("settings.storage.used", {
            used: fileSizeFormat(usedStorage),
          })}
        >
          <div className={styles.settings_page_options}>
            {loaded && usedStorage > 0 && (
              <button
                className={styles.settings_page_option}
                type="button"
                onClick={handleClear}
              >
                {t("settings.storage.clear")}
              </button>
            )}

            {!loaded && (
              <button
                className={styles.settings_page_option}
                type="button"
                onClick={handleLoad}
              >
                {t("settings.storage.load")}
              </button>
            )}
          </div>
        </Block>

        <Block title={t("settings.storage.hosting-service")}>
          <div className={styles.settings_page_options}>
            <button
              className={styles.settings_page_option}
              type="button"
              onClick={handleExportHostingService}
            >
              {t("settings.storage.export")}
            </button>

            <button
              className={styles.settings_page_option}
              type="button"
              onClick={handleImportHostingService}
            >
              {t("settings.storage.import")}
            </button>
          </div>
        </Block>

        <div className={styles.settings_page_options}>
          <button
            className={styles.settings_page_option}
            data-mobile="true"
            type="reset"
            onClick={handleBack}
          >
            {t("main.back")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingStorage;

function fileSizeFormat(bytes: number, decimals: number = 2): string {
  if (bytes < 0) {
    throw new Error("File size cannot be negative.");
  }

  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (bytes === 0) return `0 ${sizes[0]}`;

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / k ** i).toFixed(decimals));

  return `${size} ${sizes[i]}`;
}
