import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Block from "components/settings/blocks";
import { useLoadingState } from "components/loading";
import { useNotifications } from "components/notifications";
import { useAlerts } from "components/alerts";

import { useImgstor } from "services/imgstor";
import { Message, MessageButton } from "structs/message";

import HostingService from "components/settings/page/storage/hosting-service-version";

import styles from "components/settings/page/style.module.scss";


const SettingStorage: React.FC = () => {
    const { t } = useTranslation();
    const alerts = useAlerts();
    const loadingState = useLoadingState();
    const notifications = useNotifications();
    const imgstor = useImgstor();
    const [usedStorage, SetUsedStorage] = useState<number>(0);
    const [loaded, SetLoaded] = useState(false);

    const HandleLoad = async () => {
        const loading = loadingState.Append();

        const loadingNotification = notifications.Append(
            new Message({
                type: Message.Type.ALERT,
                content: t("settings.notification.load")
            })
        );

        try {
            const usage = await imgstor.Using;
            SetUsedStorage(usage);
            SetLoaded(true);
        }
        catch (err) {
            notifications.Append(new Message({
                type: Message.Type.ERROR,
                content: (err as Error).message
            }));
        }
        finally {
            loadingNotification.Remove();
            loading.Remove();
        }
    }

    const HandleExportHostingService = () => {
        const hostingServiceConfig = JSON.stringify(imgstor.Settings.Config.hostingServices);
        const configFileContent = new Blob([hostingServiceConfig]);
        const configFileName = "hostingServiceConfig.json";
        const configFile = new File([configFileContent], configFileName, { type: "application/json" });

        const a = document.createElement('a');
        a.download = configFileName;
        a.href = URL.createObjectURL(configFile);
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const HandleImportHostingService = () => {
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

                const loading = loadingState.Append();
                try {
                    const content = (reader.result || "").toString();
                    const hostingServices = HostingService.ensureVersion(content);
                    await imgstor.Settings.SaveConfig({
                        ...imgstor.Settings.Config,
                        hostingServices
                    });
                }
                catch (err) {
                    console.log(err);
                }

                loading.Remove();
            }
            reader.readAsText(file);
        }
        input.click();
    }

    const HnadleClear = () => {

        const confirm = new MessageButton(t("main.confirm"));

        confirm.on("Clicked", async () => {
            const loading = loadingState.Append();
            const clearing = notifications.Append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("settings.storage.notification.clearing")
                })
            );

            try {
                await imgstor.Clear();
                notifications.Append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("settings.sotorage.notification.cleared")
                    })
                );

                location.hash = "";
                location.reload();
            }
            catch (err) {
                notifications.Append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
                );
            }
            finally {
                loading.Remove();
                clearing.Remove();
            }
        });

        alerts.Append(
            new Message({
                type: Message.Type.ALERT,
                content: t("settings.storage.alert.clear"),
                buttons: [
                    new MessageButton(t("main.cancel")),
                    confirm
                ]
            })
        );

    }

    return <div className={styles.settings_page}>

        <Block title={t("settings.storage.used", { used: FileSizeFormat(usedStorage) })}>

            <div className={styles.settings_page_options}>

                {loaded && usedStorage > 0 &&
                    <button className={styles.settings_page_option} type="button" onClick={HnadleClear}>
                        {t("settings.storage.clear")}
                    </button>
                }

                {!loaded &&
                    <button className={styles.settings_page_option} type="button" onClick={HandleLoad}>
                        {t("settings.storage.load")}
                    </button>
                }

            </div>

        </Block>

        <Block title={t("settings.storage.hosting-service")}>
            <div className={styles.settings_page_options}>

                <button className={styles.settings_page_option} type="button" onClick={HandleExportHostingService}>
                    {t("settings.storage.export")}
                </button>

                <button className={styles.settings_page_option} type="button" onClick={HandleImportHostingService}>
                    {t("settings.storage.import")}
                </button>

            </div>
        </Block>

    </div>
}

export default SettingStorage;

function FileSizeFormat(bytes: number, decimals: number = 2): string {
    if (bytes < 0) {
        throw new Error("File size cannot be negative.");
    }

    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    if (bytes === 0) return `0 ${sizes[0]}`;

    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

    return `${size} ${sizes[i]}`;
}