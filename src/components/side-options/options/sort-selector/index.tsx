import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ImgstorImage, ImgstorImageSort as Sort } from 'services/imgstor-db';

import styles from "./style.module.scss";

interface Props {
    defaultValue: Sort
    onchange: (sort: Sort) => void
    hide: () => void
}

const SortSelector: React.FC<Props> = ({ defaultValue, onchange, hide }) => {
    const { t } = useTranslation();
    const [sort, setSort] = useState<Sort>(defaultValue);
    const [sortOptionsVisible, setSortOptionsVisible] = useState(false);
    const sortSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        onchange(sort);

    }, [sort]);

    const sortOptionsInvisible = useCallback((e: MouseEvent) => {
        if (sortOptionsVisible && sortSelectorRef.current && !sortSelectorRef.current.contains(e.target as Node)) {
            setSortOptionsVisible(false);
        }
    }, [sortOptionsVisible]);

    useEffect(() => {
        document.addEventListener("click", sortOptionsInvisible);
        return () => {
            document.removeEventListener("click", sortOptionsInvisible);
        }
    }, [sortOptionsInvisible]);

    const handleSelectSort = (e: React.MouseEvent<HTMLLIElement>) => {
        const { value } = (e.target as HTMLLIElement).dataset;
        const sortValue = value as Sort;
        if (sortValue === sort) return;
        setSort(sortValue);
        setSortOptionsVisible(false);
        hide();
    }

    return <div ref={sortSelectorRef} className={styles.images_sort_select}>
        <span className={styles.images_sort_selected_option} onClick={() => setSortOptionsVisible(true)}>{t(`image.sort.${sort}`)}</span>
        {sortOptionsVisible && <div className={styles.images_sort_options}>
            <li className={styles.images_sort_option} onClick={handleSelectSort} data-value={ImgstorImage.SORT.NEWEST}>{t("image.sort.newest")}</li>
            <li className={styles.images_sort_option} onClick={handleSelectSort} data-value={ImgstorImage.SORT.OLDEST}>{t("image.sort.oldest")}</li>
            <li className={styles.images_sort_option} onClick={handleSelectSort} data-value={ImgstorImage.SORT.DEFAULT}>{t("image.sort.default")}</li>
        </div>
        }
    </div>
}

export default SortSelector;