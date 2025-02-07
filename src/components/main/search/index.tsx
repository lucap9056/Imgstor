import { IonIcon } from "@ionic/react";
import React, { useEffect, useState } from "react";
import Imgstor, { SearchContent } from "services/imgstor";
import ImgstorDB, { ImgstorTag, ImgstorImage } from "services/imgstor-db";
import { TagsSelecterEvent } from "services/tags-selecter";


import styles from "components/main/search/style.module.scss";

interface Props {
    imgstor: Imgstor
    onchange: (content: SearchContent) => void
}

const Search: React.FC<Props> = ({ imgstor, onchange }) => {
    const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>();
    const [searchTitle, SetSearchTitle] = useState<string>();

    const app_id = "search";

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
            const { target, tags } = e.deteil;

            if (target === app_id) {
                SetSelectedTags(tags);
            }
        }

        imgstor.TagsSelecter.on("TagsSelected", TagsSelectedHandler);

        return () => {
            imgstor.TagsSelecter.off("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const HandleSelectTags = () => {
        imgstor.TagsSelecter.Request(app_id, selectedTags);
    }

    const HandleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.stopPropagation();
        e.preventDefault();
        const form = new FormData(e.target as HTMLFormElement);

        const title = (form.get("search") || "").toString();
        const encodedTitle = ImgstorDB.EncodeText(title);
        SetSearchTitle(encodedTitle);
    }

    return <form className={styles.search} onSubmit={HandleSearch}>
        <button type="button" className={styles.search_button} onClick={HandleSelectTags} >
            <IonIcon icon="pricetags"></IonIcon>
        </button>
        <input type="text" className={styles.search_input} name="search" autoComplete="off" />
        <button type="submit" className={styles.search_button}>
            <IonIcon icon="search"></IonIcon>
        </button>
    </form>;
}

export default Search;