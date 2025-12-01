import React, { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ImgstorImage } from "services/imgstor-db";
import { useImgstor } from "services/imgstor";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTags } from "@fortawesome/free-solid-svg-icons";

import { TagsSelecterEvent } from "services/tags-selecter";
import { useNotifications } from "global-components/notifications";
import { useLoader } from "global-components/loader";
import { Message } from "structs/message";

import componentStyles from "styles/components.module.scss";
import styles from "./style.module.scss";

interface Props {
    image: ImgstorImage
}

const Tags: React.FC<Props> = ({ image }) => {
    const componentId = useId();
    const notifications = useNotifications();
    const imgstor = useImgstor();
    const loader = useLoader();
    const { t } = useTranslation();
    const [tags, setTags] = useState(imgstor.db.GetImageTags(image.imageId, "tagId", "name") || []);

    useEffect(() => {

        const TagsSelectedHandler = async (e: TagsSelecterEvent<"TagsSelected">) => {
            if (e.deteil.target !== componentId) return;
            setTags(e.deteil.selected);

            const originTags = new Map(e.deteil.origin.map((tag) => [tag.tagId, tag]));
            const updatedTags = new Map(e.deteil.selected.map((tag) => [tag.tagId, tag]));

            const appendedTags = e.deteil.selected.filter((tag) => !originTags.has(tag.tagId));
            const removedTags = e.deteil.origin.filter((tag) => !updatedTags.has(tag.tagId));

            if (appendedTags.length == 0 && removedTags.length == 0) return;

            const loading = loader.append();
            const saving = notifications.append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("main.saving")
                })
            );

            try {

                for (const tag of removedTags) {
                    imgstor.db.DeleteImageTag(image.imageId, tag.tagId);
                }

                for (const tag of appendedTags) {
                    imgstor.db.InsertImageTag(image.imageId, tag.tagId);
                }

                await imgstor.db.Save();
            }
            catch (err) {
                notifications.append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
                );
            }

            saving.remove();
            loading.remove();
        }

        imgstor.tagsSelecter.on("TagsSelected", TagsSelectedHandler);
        return () => {
            imgstor.tagsSelecter.off("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const handleSelectTags = () => {
        imgstor.tagsSelecter.request(componentId, tags);
    }

    return <div className={styles.image_tags} onClick={handleSelectTags}>
        <div className={styles.icon}>
            <FontAwesomeIcon icon={faTags} />
        </div>
        <div className={styles.tags}>
            {tags.map(
                (tag) => <div className={componentStyles.tag} key={tag.tagId}>
                    {tag.name}
                </div>
            )}
        </div>
    </div>;
}

export default Tags;