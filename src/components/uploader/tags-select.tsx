import React, { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import Imgstor from "services/imgstor";
import { ImgstorTag } from "services/imgstor-db";
import { TagsSelecterEvent } from "services/tags-selecter";

import styles from "components/uploader/style.module.scss";

interface Props {
    imgstor: Imgstor
    onchange: (tags: ImgstorTag[]) => void
}

const TagsSelect: React.FC<Props> = ({ imgstor, onchange }) => {
    const { t } = useTranslation();
    const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>([]);
    const component_id = useId();

    useEffect(() => {

        const TagsSelectedHandler = (e: TagsSelecterEvent<"TagsSelected">) => {
            const { target, tags } = e.deteil;
            if (target !== component_id) {
                return;
            }

            SetSelectedTags(tags);
            onchange(tags);
        }

        imgstor.TagsSelecter.on("TagsSelected", TagsSelectedHandler);

        return () => {
            imgstor.TagsSelecter.on("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const HandleSelectTags = () => {
        imgstor.TagsSelecter.Request(component_id, selectedTags);
    }

    return <div className={styles.upload_tags} onClick={HandleSelectTags}>
        <label>{t('uploader_selected_tags')}</label>
        <div className={styles.upload_selected_tags}>
            {selectedTags.map(
                (tag) => <div className={styles.upload_selected_tag} key={tag.id}>{tag.name}</div>
            )}
        </div>
    </div>;
}

export default TagsSelect;