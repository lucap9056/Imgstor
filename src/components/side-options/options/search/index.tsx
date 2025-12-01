import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchContent, useImgstor } from "services/imgstor";
import ImgstorDB, { ImgstorTag, ImgstorImage } from "services/imgstor-db";
import { TagsSelecterEvent } from "services/tags-selecter";
import { faMagnifyingGlass, faTags, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import componentStyles from "styles/components.module.scss";
import styles from "./style.module.scss";

interface Props {
    onchange: (content: SearchContent) => void
    hide: () => void
}

const Search: React.FC<Props> = ({ onchange, hide }) => {
    const imgstor = useImgstor();
    const { t } = useTranslation();
    const [existedTags, setExistedTags] = useState(imgstor.db.GetTags());
    const [selectedTags, setSelectedTags] = useState<ImgstorTag[]>();
    const [searchTitle, setSearchTitle] = useState<string>();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const componentId = "search";

    useEffect(() => {
        if (searchTitle === undefined && selectedTags === undefined) return;

        onchange({
            title: searchTitle || "",
            tags: selectedTags || [],
            sort: ImgstorImage.SORT.DEFAULT
        });
    }, [searchTitle, selectedTags]);


    useEffect(() => {

        const TagsSelectedHandler = (e: TagsSelecterEvent<"TagsSelected">) => {
            const { target, selected } = e.deteil;

            if (target === componentId) {
                setSelectedTags(selected);

                setExistedTags(imgstor.db.GetTags());
            }
        }

        imgstor.tagsSelecter.on("TagsSelected", TagsSelectedHandler);

        return () => {
            imgstor.tagsSelecter.off("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const handleSelectTags = () => {
        imgstor.tagsSelecter.request(componentId, selectedTags);
    }

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.stopPropagation();
        e.preventDefault();
        const form = new FormData(e.target as HTMLFormElement);

        const title = (form.get("search") || "").toString();
        const encodedTitle = ImgstorDB.EncodeText(title);
        setSearchTitle(encodedTitle);
        hide();
    }

    const handleResetFilter = () => {
        setSelectedTags([]);
        setSearchTitle("");
        if (searchInputRef.current) {
            searchInputRef.current.value = "";
        }
        hide();
    }

    const handleSearchTag = (tag: ImgstorTag) => {
        setSelectedTags([tag]);
        hide();
    }

    return <div className={styles.search}>
        <form onSubmit={handleSearch}>
            <input ref={searchInputRef} type="text" name="search" autoComplete="off" />
            <button type="submit">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
        </form>
        <div className={styles.options}>
            <button type="button" className={styles.option} onClick={handleSelectTags} >
                <FontAwesomeIcon icon={faTags} />{t("search.label.tags")}
            </button>
            {((selectedTags || []).length > 0 || (searchTitle || "").length > 0) &&
                <button type="button" className={styles.option} onClick={handleResetFilter} >
                    <FontAwesomeIcon icon={faXmark} />{t("search.label.reset")}
                </button>
            }

        </div>
        <div className={styles.tags}>
            {existedTags.slice(0, 10).map((tag) =>
                <span className={componentStyles.tag} key={tag.tagId} onClick={() => handleSearchTag(tag)}>{tag.name}</span>
            )
            }
        </div>
    </div>
}

export default Search;