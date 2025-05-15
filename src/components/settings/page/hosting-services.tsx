import React from "react";
import { useTranslation } from "react-i18next";

import Block from "components/settings/blocks";
import Textbox from "components/settings/blocks/textbox";
import Toggle from "components/settings/blocks/toggle";
import Label from "components/settings/blocks/label";
import { useLoadingState } from "components/loading";
import { useNotifications } from "components/notifications";

import { useImgstor } from "services/imgstor";
import Settings, { HostingServicesConfig } from "services/settings";
import { Message } from "structs/message";

import styles from "components/settings/page/style.module.scss";

const enum NAMES {
    LOCAL_ENABLE = "local_enable",

    IMPORT_ENABLE = "import_enable",

    IMGUR_ENABLE = "imgur_enable",
    IMGUR_CLIENT_ID = "imgur_client_id",

    CATBOX_ENABLE = "catbox_enable",
    CATBOX_PROXY = "catbox_proxy",
    CATBOX_USERHASH = "catbox_userhash",
    CATBOX_SEPARATE_PREVIEW = "catbox_separate_preview",

    SMMS_ENABLE = "smms_enable",
    SMMS_PROXTY = "smms_proxy",
    SMMS_TOKEN = "smms_token",
    SMMS_SEPARATE_PREVIEW = "smms_separate_preview",
}

class Form {
    private formData: FormData;
    constructor(target: EventTarget) {
        this.formData = new FormData(target as HTMLFormElement);
    }

    public get(key: string): string {
        const value = this.formData.get(key);
        return (value === null) ? "" : value.toString();
    }
}

const SettingHostingServices: React.FC = () => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const { local, importExternal, imgur, catbox, smms } = imgstor.Settings.Config.hostingServices;


    const HandleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const config = imgstor.Settings.Config;

        const form = new Form(e.target)

        const saving = loadingState.Append();
        const savingMessage = new Message({
            type: Message.Type.ALERT,
            content: "saving..."
        });

        notifications.Append(savingMessage);
        try {
            const updatedHostingServicesConfig: HostingServicesConfig = {
                version: Settings.HOSTING_SERVICE_VERSION,
                local: {
                    isEnabled: form.get(NAMES.LOCAL_ENABLE) === "true",
                },
                importExternal: {
                    isEnabled: form.get(NAMES.IMPORT_ENABLE) === "true",
                },
                imgur: {
                    isEnabled: form.get(NAMES.IMGUR_ENABLE) === "true",
                    clientId: form.get(NAMES.IMGUR_CLIENT_ID)
                },
                catbox: {
                    isEnabled: form.get(NAMES.CATBOX_ENABLE) === "true",
                    proxy: form.get(NAMES.CATBOX_PROXY),
                    userhash: form.get(NAMES.CATBOX_USERHASH),
                    separatePreviewUpload: form.get(NAMES.CATBOX_SEPARATE_PREVIEW) === "true"
                },
                smms: {
                    isEnabled: form.get(NAMES.SMMS_ENABLE) === "true",
                    proxy: form.get(NAMES.SMMS_PROXTY),
                    token: form.get(NAMES.SMMS_TOKEN),
                    separatePreviewUpload: form.get(NAMES.SMMS_SEPARATE_PREVIEW) === "true"
                }
            }

            await imgstor.Settings.SaveConfig({
                ...config,
                hostingServices: updatedHostingServicesConfig
            });
        }
        catch (err) {
            notifications.Append(new Message({
                type: Message.Type.ERROR,
                content: (err as Error).message
            }));
        }
        finally {
            saving.Remove();
            savingMessage.Remove();
        }
    }

    return <form className={styles.settings_page} onSubmit={HandleSave}>
        <Block title={t("settings.hosting-service.title.local")} visible={false}>

            <Label>{t("settings.hosting-service.description.local")}</Label>
            <Toggle
                label={t("settings.hosting-service.enable")}
                name={NAMES.LOCAL_ENABLE}
                value={local.isEnabled}
            />

        </Block>
        <Block title={t("settings.hosting-service.title.import")} visible={false}>

            <Label>{t("settings.hosting-service.description.import")}</Label>
            <Toggle
                label={t("settings.hosting-service.enable")}
                name={NAMES.IMPORT_ENABLE}
                value={importExternal.isEnabled}
            />

        </Block>
        <Block title={t("settings.hosting-service.title.imgur")}>

            <Toggle
                label={t("settings.hosting-service.enable")}
                name={NAMES.IMGUR_ENABLE}
                value={imgur.isEnabled}
            />
            <Textbox
                label={t("settings.hosting-service.client-id")}
                name={NAMES.IMGUR_CLIENT_ID}
                password={true}
                value={imgur.clientId}
            />

        </Block>
        <Block title={t("settings.hosting-service.title.catbox")}>

            <Toggle
                label={t("settings.hosting-service.enable")}
                name={NAMES.CATBOX_ENABLE}
                value={catbox.isEnabled}
            />
            <Textbox
                label={t("settings.hosting-service.proxy")}
                name={NAMES.CATBOX_PROXY}
                value={catbox.proxy}
            />
            <Textbox
                label={t("settings.hosting-service.userhash")}
                name={NAMES.CATBOX_USERHASH}
                password={true}
                value={catbox.userhash}
            />
            <Toggle label={t("settings.hosting-service.separate-preview")}
                name={NAMES.CATBOX_SEPARATE_PREVIEW}
                value={catbox.separatePreviewUpload}
            ></Toggle>

        </Block>
        <Block title={t("settings.hosting-service.title.sm-ms")}>

            <Toggle
                label={t("settings.hosting-service.enable")}
                name={NAMES.SMMS_ENABLE}
                value={smms.isEnabled}
            />
            <Textbox
                label={t("settings.hosting-service.proxy")}
                name={NAMES.SMMS_PROXTY}
                value={smms.proxy}
            />
            <Textbox
                label={t("settings.hosting-service.api-token")}
                name={NAMES.SMMS_TOKEN}
                password={true}
                value={smms.token}
            />
            <Toggle
                label={t("settings.hosting-service.separate-preview")}
                name={NAMES.SMMS_SEPARATE_PREVIEW}
                value={smms.separatePreviewUpload}
            />

        </Block>

        <div className={styles.settings_page_separator}></div>
        <div className={styles.settings_page_options}>
            <button className={styles.settings_page_option} type="submit">{t("main.save")}</button>
        </div>
    </form>
}


export default SettingHostingServices;