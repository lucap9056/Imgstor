import React from "react";
import { useTranslation } from "react-i18next";

import Block from "components/settings/blocks";
import Textbox from "components/settings/blocks/textbox";
import Toggle from "components/settings/blocks/toggle";
import Label from "components/settings/blocks/label";
import { loadingManager } from "components/loading";
import { imgstorNotifications } from "components/notifications";

import Imgstor from "services/imgstor";
import { Message } from "utils/message";

import styles from "components/settings/page/style.module.scss";
import settings_styles from "components/settings/style.module.scss";

interface Props {
    imgstor: Imgstor
}

const SettingHostingServices: React.FC<Props> = ({ imgstor }) => {
    const { t } = useTranslation();
    const { local, importExternal, imgur, catbox, smms } = imgstor.Settings.Config.hostingServices;


    const HandleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const config = imgstor.Settings.Config;

        const form = new FormData(e.target as HTMLFormElement);

        const saving = loadingManager.Append();
        const savingMessage = new Message(Message.Type.ALERT, "saving...");

        imgstorNotifications.Append(savingMessage);
        try {
            Object.assign(config.hostingServices, {
                local: {
                    enabled: (form.get("only_drive_enabled") || "").toString() === "true",
                },
                importExternal: {
                    enabled: (form.get("import_enabled") || "").toString() === "true",
                },
                imgur: {
                    enabled: (form.get("imgur_enabled") || "").toString() === "true",
                    clientId: (form.get("imgur_client_id") || "").toString()
                },
                catbox: {
                    enabled: (form.get("catbox_enabled") || "").toString() === "true",
                    proxy: (form.get("catbox_proxy") || "").toString(),
                    userhash: (form.get("catbox_userhash") || "").toString()
                },
                smms: {
                    enabled: (form.get("smms_enabled") || "").toString() === "true",
                    proxy: (form.get("smms_proxy") || "").toString(),
                    token: (form.get("smms_token") || "").toString(),
                }
            });

            await imgstor.Settings.SaveConfig(config);
        }
        catch (err) {
            imgstorNotifications.Append(new Message(Message.Type.ERROR, (err as Error).message));
        }
        finally {
            saving.Remove();
            savingMessage.Remove();
        }
    }

    return <form className={styles.settings_page} onSubmit={HandleSave}>
        <Block title="Local">
            <Label>{t("settings_page_hosting_services_description_local")}</Label>
            <Toggle label="Enabled" name="only_drive_enabled" value={local.enabled}></Toggle>
        </Block>
        <Block title="Import">
            <Label>{t("settings_page_hosting_services_description_import")}</Label>
            <Toggle label="Enabled" name="import_enabled" value={importExternal.enabled}></Toggle>
        </Block>
        <Block title="Imgur">
            <Toggle label="Enabled" name="imgur_enabled" value={imgur.enabled}></Toggle>
            <Textbox label="Client ID" name="imgur_client_id" password={true} value={imgur.clientId} />
        </Block>
        <Block title="Catbox">
            <Toggle label="Enabled" name="catbox_enabled" value={catbox.enabled}></Toggle>
            <Textbox label="Proxy" name="catbox_proxy" value={catbox.proxy} />
            <Textbox label="Userhash" name="catbox_userhash" password={true} value={catbox.userhash} />
        </Block>
        <Block title="SM.MS">
            <Toggle label="Enabled" name="smms_enabled" value={smms.enabled}></Toggle>
            <Textbox label="Proxy" name="smms_proxy" value={smms.proxy} />
            <Textbox label="API Token" name="smms_token" password={true} value={smms.token} />
        </Block>

        <div className={settings_styles.settings_interval}></div>
        <div className={styles.settings_page_options}>
            <button className={styles.settings_page_option} type="submit">{t("settings_save")}</button>
        </div>
    </form>
}

export default SettingHostingServices;