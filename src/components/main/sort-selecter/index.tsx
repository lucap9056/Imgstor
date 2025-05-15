import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ImgstorImage, ImgstorImageSort as Sort } from 'services/imgstor-db';

import styles from "components/main/sort-selecter/style.module.scss";

interface Props {
    defaultValue: Sort
    onchange: (sort: Sort) => void
}

const SortSelecter: React.FC<Props> = ({ defaultValue, onchange }) => {
    const { t } = useTranslation();
    const [sort, SetSort] = useState<Sort>(defaultValue);
    const [sortOptionsVisible, SetSortOptionsVisible] = useState(false);
    const sortSelecterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        onchange(sort);

    }, [sort, onchange]);

    const SortOptionsInvisible = useCallback((e: MouseEvent) => {
        if (sortOptionsVisible && sortSelecterRef.current && !sortSelecterRef.current.contains(e.target as Node)) {
            SetSortOptionsVisible(false);
        }
    }, [sortOptionsVisible]);

    useEffect(() => {
        document.addEventListener("click", SortOptionsInvisible);
        return () => {
            document.removeEventListener("click", SortOptionsInvisible);
        }
    }, [SortOptionsInvisible]);

    const HandleSelectSort = (e: React.MouseEvent<HTMLLIElement>) => {
        const { value } = (e.target as HTMLLIElement).dataset;
        const sortValue = value as Sort;
        if (sortValue === sort) return;
        SetSort(sortValue);
        SetSortOptionsVisible(false);
    }

    return <div ref={sortSelecterRef} className={styles.images_sort_select}>
        <span className={styles.images_sort_selected_option} onClick={() => SetSortOptionsVisible(true)}>{t(`image.sort.${sort}`)}</span>
        {sortOptionsVisible ?
            <div className={styles.images_sort_options}>
                <li className={styles.images_sort_option} onClick={HandleSelectSort} data-value={ImgstorImage.SORT.NEWEST}>{t("image.sort.newest")}</li>
                <li className={styles.images_sort_option} onClick={HandleSelectSort} data-value={ImgstorImage.SORT.OLDEST}>{t("image.sort.oldest")}</li>
                <li className={styles.images_sort_option} onClick={HandleSelectSort} data-value={ImgstorImage.SORT.DEFAULT}>{t("image.sort.default")}</li>
            </div> :
            <></>
        }
    </div>
}

export default SortSelecter;