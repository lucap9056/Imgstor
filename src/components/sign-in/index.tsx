import React from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';

import styles from "components/sign-in/style.module.scss";
import index_styles from "@/index.module.scss";

interface Props {
    onSignIn: () => Promise<void>
}

const SignIn: React.FC<Props> = ({ onSignIn }) => {
    const { t } = useTranslation();

    return <div className={styles.signin_container}>
        <div className={styles.signin}>
            <div className={styles.signin_left}>
                <div className={`${styles.signin_appname}  ${index_styles.button}`}>{t("app_name")}</div>
                <button className={styles.signin_button} onClick={() => onSignIn()}>
                    {t('signin_with_google')}
                </button>

            </div>
            <div className={styles.signin_right}>
                <div className={styles.signin_mark}>
                    <div className={`${styles.signin_mark_file1}  ${styles.signin_mark_file}`}></div>
                    <div className={`${styles.signin_mark_file2}  ${styles.signin_mark_file}`}></div>
                    <div className={`${styles.signin_mark_file3}  ${styles.signin_mark_file}`}></div>

                    <div className={styles.signin_mark_cloud1}>
                        <IonIcon icon="cloud" />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                    <div className={styles.signin_mark_cloud2}>
                        <IonIcon icon="cloud" />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                    <div className={styles.signin_mark_cloud3}>
                        <IonIcon icon="cloud" />
                        <div className={styles.signin_mark_cloud}></div>
                    </div>

                </div>
                <div className={styles.signin_description}>
                    {t("app_description")}
                </div>
            </div>
        </div>
    </div>
}

export default SignIn;