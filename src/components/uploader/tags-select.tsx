import React, { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import Imgstor from "services/imgstor";
import { ImgstorTag } from "services/imgstor-db";
import { TagsSelectorEvent } from "services/tags-selector";

import componentStyles from "styles/components.module.scss";
import styles from "./style.module.scss";

interface Props {
    imgstor: Imgstor
    onchange: (tags: ImgstorTag[]) => void
}

const TagsSelect: React.FC<Props> = ({ imgstor, onchange }) => {
    const { t } = useTranslation();
    const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>([]);
    const componentId = useId();

    useEffect(() => {

        const TagsSelectedHandler = (e: TagsSelectorEvent<"TagsSelected">) => {
            const { target, selected } = e.deteil;
            if (target !== componentId) {
                return;
            }

            SetSelectedTags(selected);
            onchange(selected);
        }

        imgstor.tagsSelector.on("TagsSelected", TagsSelectedHandler);

        return () => {
            imgstor.tagsSelector.on("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const HandleSelectTags = () => {
        imgstor.tagsSelector.request(componentId, selectedTags);
    }

    return <div className={styles.upload_tags} onClick={HandleSelectTags}>
        <label>{t('uplaoder.label.selected-tags')}</label>
        <div className={styles.upload_selected_tags}>
            {selectedTags.map(
                (tag) => <div className={componentStyles.tag} key={tag.tagId}>{tag.name}</div>
            )}
            <div className={componentStyles.tag} key={"+"}>+</div>
        </div>
    </div>;
}

export default TagsSelect;