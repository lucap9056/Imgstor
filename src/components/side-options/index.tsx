import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownWideShort, faCloudArrowUp, faGear, faMagnifyingGlass, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

import cookies from "js-cookie";
import { ImgstorImage, ImgstorImageSort as Sort } from "services/imgstor-db";
import { SearchContent, useImgstor } from "services/imgstor";
import RoutePaths from "route-paths";

import Search from "./options/search";
import SortSelecter from "./options/sort-selecter";

import styles from "./style.module.scss";

const SideOptions: React.FC = () => {
    const navigate = useNavigate();
    const imgstor = useImgstor();
    const [sidePage, setSidePage] = useState<React.ReactNode>();
    const [sidePageName, setSidePageName] = useState<string>();
    const [searchContent, setSearchContent] = useState<SearchContent>();
    const defaultSort = cookies.get("sort") as Sort || ImgstorImage.SORT.DEFAULT;
    const [sort, setSort] = useState<Sort>(defaultSort);

    useEffect(() => {
        if (searchContent === undefined) return;

        const content = { ...searchContent, sort };
        imgstor.setImageSearch(content);
    }, [searchContent, sort]);

    const handleHideSidePage = () => {
        setSidePageName(undefined);
    }

    const handleVisibleSearch = () => {
        const name = "search";
        if (sidePageName === name) {
            setSidePageName(undefined);
            return;
        }
        setSidePageName(name);
        setSidePage(<Search onchange={setSearchContent} hide={handleHideSidePage}></Search>);
    }

    const handleVisibleSortSelector = () => {
        const name = "sort-selector";
        if (sidePageName === name) {
            setSidePageName(undefined);
            return;
        }
        setSidePageName(name);
        setSidePage(<SortSelecter onchange={setSort} defaultValue={defaultSort} hide={handleHideSidePage}></SortSelecter>)
    }

    const handleVisibleUploader = () => {
        navigate(RoutePaths.UPLOAD);
    }

    const handleVisibleSettings = () => {
        if (window.matchMedia('(max-width: 48rem)').matches) {
            navigate(RoutePaths.SETTINGS);
        } else {
            navigate(RoutePaths.SETTINGS + RoutePaths.SETTING_HOSTING_SERVICES);
        }
    }

    const handleLogout = () => {
        imgstor.logout();
        location.reload();
    }

    return <div className={styles.container}>
        <div className={styles.side_page} data-visibled={sidePageName !== undefined}>
            {sidePage}
        </div>
        <div className={styles.side_options}>

            <div className={styles.side_option} onClick={handleVisibleSortSelector}>
                <FontAwesomeIcon icon={faArrowDownWideShort} />
            </div>

            <div className={styles.side_option} onClick={handleVisibleSearch}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
            </div>

            <div className={styles.side_option} onClick={handleVisibleUploader}>
                <FontAwesomeIcon icon={faCloudArrowUp} />
            </div>

            <div style={{ flex: 1 }}></div>

            <div className={styles.side_option} onClick={handleVisibleSettings}>
                <FontAwesomeIcon icon={faGear} />
            </div>

            <div className={styles.side_option} onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} />
            </div>

        </div>
    </div>
}

export default SideOptions;