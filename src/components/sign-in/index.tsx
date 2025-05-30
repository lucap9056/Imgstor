import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from "components/sign-in/style.module.scss";
import index_styles from "@/index.module.scss";
import { faCloud } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Props {
    onSignIn: () => Promise<void>
}

const SignIn: React.FC<Props> = ({ onSignIn }) => {
    const { t } = useTranslation();

    return <div className={styles.signin_container}>
        <div className={styles.signin}>
            <div className={styles.signin_left}>
                <div className={`${styles.signin_appname}  ${index_styles.button}`}>{t("app.name")}</div>
                <button className={styles.signin_button} onClick={() => onSignIn()}>
                    {t('google.signin')}
                </button>

            </div>
            <div className={styles.signin_right}>
                <div className={styles.signin_mark}>
                    <div className={`${styles.signin_mark_file1}  ${styles.signin_mark_file}`}></div>
                    <div className={`${styles.signin_mark_file2}  ${styles.signin_mark_file}`}></div>
                    <div className={`${styles.signin_mark_file3}  ${styles.signin_mark_file}`}></div>

                    <div className={styles.signin_mark_cloud1}>
                        <FontAwesomeIcon icon={faCloud} />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                    <div className={styles.signin_mark_cloud2}>
                        <FontAwesomeIcon icon={faCloud} />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                    <div className={styles.signin_mark_cloud3}>
                        <FontAwesomeIcon icon={faCloud} />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                </div>
                <div className={styles.signin_description}>
                    {t("app.description")}
                </div>
            </div>
        </div>
    </div>
}

export default SignIn;