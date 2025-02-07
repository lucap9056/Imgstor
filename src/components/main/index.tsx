import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import cookies from "js-cookie";

import RoutePaths from 'route-paths';

import ImagesSortSelector from "components/main/sort-selecter";
import Search from 'components/main/search';
import Images from 'components/images';
import Menu from 'components/menu';

import { ImgstorImage, ImgstorImageSort as Sort } from "services/imgstor-db";
import Imgstor, { SearchContent } from 'services/imgstor';


import styles from "components/main/style.module.scss";

const enum MOBILE_MODE {
    DEFAULT = 0,
    SORT = 1,
    SEARCH = 2,
}

interface Props {
    imgstor: Imgstor
}

const Main: React.FC<Props> = ({ imgstor }) => {
    const navigate = useNavigate();
    const [searchContent, SetSearchContent] = useState<SearchContent>();

    const defaultSort = cookies.get("sort") as Sort || ImgstorImage.SORT.DEFAULT;
    const [sort, SetSort] = useState<Sort>(defaultSort);

    const [mobileMode, SetMobileMode] = useState(MOBILE_MODE.DEFAULT);

    useEffect(() => {
        if (searchContent === undefined) return;

        const content = { ...searchContent, sort };

        imgstor.SetImageSearch(content);
    }, [searchContent, sort]);

    const HandleUpload = () => {
        navigate(RoutePaths.UPLOAD);
    }

    const HandleMobileSetMode = (mode: MOBILE_MODE) => {
        if (mode === mobileMode) {
            SetMobileMode(MOBILE_MODE.DEFAULT);
        } else {
            SetMobileMode(mode);
        }
    }

    const HandleSearchChanged = (content: SearchContent) => {
        SetSearchContent(content);
    }

    const HandleSortChanged = (s: Sort) => {
        if (searchContent === undefined) {
            SetSearchContent({ tags: [], title: "", sort: s });
        }
        SetSort(s);
        cookies.set("sort", s);
    }

    return <>
        <div className={styles.main_mobile_header}>
            <div className={styles.main_mobile_header_buttons}>
                <button
                    className={styles.main_mobile_header_button}
                    data-active={mobileMode === MOBILE_MODE.SORT}
                    onClick={() => HandleMobileSetMode(MOBILE_MODE.SORT)}>
                    <IonIcon icon="swap-vertical" />
                </button>
                <button
                    className={styles.main_mobile_header_button}
                    data-active={mobileMode === MOBILE_MODE.SEARCH}
                    onClick={() => HandleMobileSetMode(MOBILE_MODE.SEARCH)}>
                    <IonIcon icon="search" />
                </button>

                <button className={styles.main_mobile_header_button} onClick={HandleUpload}>
                    <IonIcon icon="cloud-upload" />
                </button>
                <div className={styles.main_mobile_header_button}>
                    <Menu imgstor={imgstor} />
                </div>
            </div>

            <div className={styles.main_mobile_content}>

                {
                    mobileMode === MOBILE_MODE.SORT &&
                    <ImagesSortSelector defaultValue={defaultSort} onchange={HandleSortChanged} />
                }
                {
                    mobileMode === MOBILE_MODE.SEARCH &&
                    <Search imgstor={imgstor} onchange={HandleSearchChanged} />
                }

            </div>

        </div>

        <div className={styles.main_desktop_header}>
            <div className={styles.main_desktop_header_left}>
                <ImagesSortSelector defaultValue={defaultSort} onchange={HandleSortChanged} />
            </div>
            <div className={styles.main_desktop_header_center}>
                <Search imgstor={imgstor} onchange={HandleSearchChanged} />
            </div>
            <div className={styles.main_desktop_header_right}>
                <button className={styles.main_desktop_header_right_button} onClick={HandleUpload}>
                    <IonIcon icon="cloud-upload" />
                </button>
                <Menu imgstor={imgstor} />
            </div>
        </div>

        <Images imgstor={imgstor} />
    </>
}

export default Main;