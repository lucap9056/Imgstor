/**
 * 右上角Menu
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useImgstor } from 'services/imgstor';
import { useNavigate } from 'react-router-dom';
import RoutePaths from "route-paths";

import styles from "components/menu/style.module.scss";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

const Menu: React.FC = () => {
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const [display, SetDisplay] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {

        const HandleClick = (e: MouseEvent) => {
            if (display) {
                SetDisplay(false);
            } else if (menuRef.current && menuRef.current === e.target) {
                SetDisplay(true);
            }

        }

        document.addEventListener("click", HandleClick);
        return () => {
            document.removeEventListener("click", HandleClick);
        };
    }, [menuRef, display, SetDisplay]);

    const HandleSettingsDisplay = () => {
        imgstor.Settings.Display = true;
        navigate(RoutePaths.SETTINGS + RoutePaths.SETTING_HOSTING_SERVICES);
    }

    const HandleImgstorSignOut = () => {
        imgstor.SignOut();
        location.reload();
    }

    return <div ref={menuRef} className={styles.menu}>
        <FontAwesomeIcon icon={faBars} />
        {
            display ?
                <div className={styles.menu_options}>
                    <li className={styles.menu_option} onClick={HandleSettingsDisplay}>{t('menu.settings')}</li>
                    <li className={styles.menu_option} onClick={HandleImgstorSignOut}>{t('menu.signout')}</li>
                </div>
                : <></>
        }
    </div>
}

export default Menu;