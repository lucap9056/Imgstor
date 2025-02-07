/**
 * 主要設定畫面
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Link, Route, Routes, useNavigate } from "react-router-dom";

import RoutePaths from 'route-paths/index';
import HostingServices from "./page/hosting-services";

import Imgstor from 'services/imgstor';

import styles from "components/settings/style.module.scss";
import index_styles from "@/index.module.scss";

interface Props {
    imgstor: Imgstor
}

const SettingsComponent: React.FC<Props> = ({ imgstor }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const Back = () => {
        navigate(RoutePaths.HOME);
    }

    return <div className={styles.settings_container}>
        <div className={styles.settings}>

            <div className={styles.settings_pages}>
                <Link to={RoutePaths.SETTINGS + RoutePaths.SETTING_HOSTING_SERVICES}>
                    <div className={styles.settings_pages_option}>{t("settings_page_hosting_services")}</div>
                </Link>
                <div className={styles.settings_interval}></div>
                <div className={`${styles.settings_pages_option} ${index_styles.button}`} onClick={Back}>{t("settings_back")}</div>
            </div>

            <div className={styles.settings_page_container}>
                <Routes>
                    <Route path={RoutePaths.SETTING_HOSTING_SERVICES} element={<HostingServices imgstor={imgstor} />}></Route>
                </Routes>
            </div>

        </div>
    </div>;
}

export default SettingsComponent;