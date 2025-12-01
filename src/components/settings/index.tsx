/**
 * 主要設定畫面
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Link, Route, Routes, useNavigate } from "react-router-dom";

import RoutePaths from 'route-paths/index';
import HostingServices from "components/settings/page/hosting-services";
import Storage from "components/settings/page/storage";

import styles from "components/settings/style.module.scss";

const SettingsComponent: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const Back = () => {
        navigate(RoutePaths.HOME);
    }

    return <div className={styles.settings_container}>
        <div className={styles.settings}>

            <div className={styles.settings_pages}>
                <Link to={RoutePaths.SETTINGS + RoutePaths.SETTING_HOSTING_SERVICES}>
                    <div className={styles.settings_pages_option}>{t("settings.option.hosting-service")}</div>
                </Link>
                <Link to={RoutePaths.SETTINGS + RoutePaths.SETTING_STORAGE}>
                    <div className={styles.settings_pages_option}>{t("settings.option.storage")}</div>
                </Link>
                <div className={styles.settings_interval}></div>
                <button className={`${styles.settings_pages_option}`} onClick={Back}>{t("main.back")}</button>
            </div>

            <Routes>
                <Route path={RoutePaths.SETTING_HOSTING_SERVICES} element={<HostingServices />}></Route>
                <Route path={RoutePaths.SETTING_STORAGE} element={<Storage />} />
            </Routes>

        </div>
    </div>;
}

export default SettingsComponent;