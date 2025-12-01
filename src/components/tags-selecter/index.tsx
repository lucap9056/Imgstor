import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNotifications } from "global-components/notifications";
import { useAlerts } from "global-components/alerts";
import { useLoader } from "global-components/loader";
import { Message, MessageButton } from "structs/message";

import { useImgstor } from "services/imgstor";
import { ImgstorTag } from "services/imgstor-db";
import { TagsSelecterEvent } from "services/tags-selecter";

import TagItem from "components/tags-selecter/tag-item";


import componentStyles from "styles/components.module.scss";
import styles from "./style.module.scss";

interface DraggingPosation {
    x: number
    y: number
}

const TagsSelecter: React.FC = () => {
    const notifications = useNotifications();
    const loader = useLoader();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const [target, setTarget] = useState<string>();
    const [selectedTags, setSelectedTags] = useState<ImgstorTag[]>([]);
    const [notusedTags, setNotusedTags] = useState<ImgstorTag[]>([]);
    const [draggingTag, setDraggingTag] = useState<ImgstorTag>();
    const [draggingPosation, setDraggingPosation] = useState<DraggingPosation>();
    const selecter = useRef<HTMLDivElement>(null);
    const selected = useRef<HTMLDivElement>(null);
    const notused = useRef<HTMLDivElement>(null);
    const remove = useRef<HTMLDivElement>(null);

    useEffect(() => {

        const displayChangedHandler = (e: TagsSelecterEvent<"DisplayChanged">) => {

            if (e.detail) {
                const { target, origin } = e.detail;
                setSelectedTags([...origin]);

                const tagMap: { [key: string]: boolean } = {};
                for (const { tagId } of origin) {
                    tagMap[tagId] = true;
                }

                const notused = imgstor.db.GetTags().filter(({ tagId }) => tagMap[tagId] === undefined);
                setNotusedTags(notused);

                setTarget(target);
            } else {
                setTarget(undefined);
                if (imgstor.db.Changed) {
                    (async () => {
                        const loading = loader.append();
                        const saving = new Message({
                            type: Message.Type.NORMAL,
                            content: t("saving")
                        });
                        notifications.append(saving);
                        try {
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
                        finally {
                            saving.remove();
                            loading.remove();
                        }
                    })();
                }
            }
        }

        imgstor.tagsSelecter.on("DisplayChanged", displayChangedHandler);

        return () => {
            imgstor.tagsSelecter.off("DisplayChanged", displayChangedHandler);
        }
    }, []);



    const handleRemoveTag = (tag: ImgstorTag) => {
        const { tagId, name } = tag;

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {

            if (selectedTags.find(t => t.tagId === tagId)) {
                setSelectedTags(selectedTags.filter(t => t.tagId !== tagId));
            }

            if (notusedTags.find(t => t.tagId === tagId)) {
                setNotusedTags(notusedTags.filter(t => t.tagId !== tagId));
            }

            imgstor.db.DeleteTag(tagId);
        });

        const removeMessage = new Message({
            type: Message.Type.ALERT,
            content: t("tags-selecter.alert.remove-tag", { name }),
            buttons: [
                new MessageButton(t("main.cancel")),
                confirm
            ]
        });
        alerts.append(removeMessage);
    };

    const handleSelectTag = ({ tagId }: ImgstorTag) => {
        const tagIndex = notusedTags.findIndex((t) => t.tagId === tagId);
        if (tagIndex === -1) return;
        const notused = notusedTags;
        const tag = notused.splice(tagIndex, 1)[0];

        setSelectedTags([...selectedTags, tag]);
        setNotusedTags([...notused]);
    }

    const handleUnselectTag = ({ tagId }: ImgstorTag) => {
        const tagIndex = selectedTags.findIndex((t) => t.tagId === tagId);
        if (tagIndex === -1) return;
        const selected = selectedTags;
        const tag = selected.splice(tagIndex, 1)[0];

        setNotusedTags([...notusedTags, tag]);
        setSelectedTags([...selected]);
    }


    useEffect(() => {

        const container = selecter.current;
        const select = selected.current;
        if (!container || !select) return;

        const handleDragEnd = (e: MouseEvent | TouchEvent) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            let clientX = 0;
            let clientY = 0;

            if ("touches" in e) {
                const touch = e.touches[0] || e.changedTouches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            if (draggingTag) {
                const selectedRect = selected.current?.getBoundingClientRect();
                const notusedRect = notused.current?.getBoundingClientRect();
                const removeRect = remove.current?.getBoundingClientRect();

                const isInSelected = selectedRect && clientX >= selectedRect.left && clientX <= selectedRect.right && clientY >= selectedRect.top && clientY <= selectedRect.bottom;
                const isInNotused = notusedRect && clientX >= notusedRect.left && clientX <= notusedRect.right && clientY >= notusedRect.top && clientY <= notusedRect.bottom;
                const isInRemove = removeRect && clientX >= removeRect.left && clientX <= removeRect.right && clientY >= removeRect.top && clientY <= removeRect.bottom;

                if (isInSelected) handleSelectTag(draggingTag);
                if (isInNotused) handleUnselectTag(draggingTag);
                if (isInRemove) handleRemoveTag(draggingTag);
            }

            setDraggingPosation(undefined);
            setDraggingTag(undefined);
        }



        const handlePointMove = (e: MouseEvent | TouchEvent) => {
            let clientX = 0;
            let clientY = 0;

            if ("touches" in e) {
                const touch = e.touches[0] || e.changedTouches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const rect = container.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            setDraggingPosation({ x, y });
        };

        if (draggingTag) {
            window.addEventListener("mouseup", handleDragEnd);
            window.addEventListener("touchend", handleDragEnd);

            container.addEventListener("mouseleave", handleDragEnd);

            container.addEventListener("mousemove", handlePointMove);
            container.addEventListener("touchmove", handlePointMove);



        } else {
            setDraggingPosation(undefined);
        }


        return () => {
            window.removeEventListener("mouseup", handleDragEnd);
            window.removeEventListener("touchend", handleDragEnd);

            container.removeEventListener("mouseleave", handleDragEnd);

            container.removeEventListener("mousemove", handlePointMove);
            container.removeEventListener("touchmove", handlePointMove);
        }
    }, [draggingTag]);

    const handleCreateTag = (e: React.FormEvent<HTMLFormElement>) => {
        const target = e.target as HTMLFormElement;
        e.stopPropagation();
        e.preventDefault();

        const form = new FormData(target);
        const name = (form.get("tag_name") || "").toString();

        if (name === "") return;

        target.reset();

        const tagId = imgstor.db.InsertTag(name);
        const tag: ImgstorTag = { tagId, name };

        setSelectedTags([...selectedTags, tag]);
    }

    const handleDragTag = (tag: ImgstorTag) => {
        setDraggingTag(tag);
    }

    const HandleClickTag = (tag: ImgstorTag) => {

        if (selectedTags.find((t) => t.tagId === tag.tagId)) {
            handleUnselectTag(tag);
        } else {
            handleSelectTag(tag);
        }

    }

    const handleCancel = () => {
        imgstor.tagsSelecter.selected();
    }

    const handleConfirm = () => {
        imgstor.tagsSelecter.selected(selectedTags);
    }

    if (target === undefined) {
        return <></>;
    }

    return <div className={styles.tags_selecter_container}>
        <div className={styles.tags_selecter} ref={selecter}>
            <div className={styles.tags_selecter_selected_tags} ref={selected}>
                {selectedTags.map(
                    (tag) => <TagItem className={componentStyles.tag} key={tag.tagId} tag={tag} ondrag={handleDragTag} onclick={HandleClickTag} />
                )}
            </div>

            <div className={styles.tags_selecter_tag_options}>

                <form className={styles.tags_selecter_tag_option} onSubmit={handleCreateTag}>

                    <span className={styles.tags_selecter_tag_option_label}>{t("tags-selecter.tag.create.label")}</span>
                    <input type="textbox" className={styles.tags_selecter_add_tag_input} name="tag_name" />
                    <button className={styles.tags_selecter_add_tag_button} type="submit">{t("main.confirm")}</button>

                </form>

                <form className={styles.tags_selecter_tag_option}>

                    <span className={styles.tags_selecter_tag_option_label}>{t("tags-selecter.tag.remove.label")}</span>
                    <div className={styles.tags_selecter_remove_tag_block} data-label={t("tags-selecter.tag.remove.drag")}
                        ref={remove}
                    ></div>

                </form>
            </div>

            <div className={styles.tags_selecter_not_used_tags} ref={notused}>
                {notusedTags.map(
                    (tag) => <TagItem className={componentStyles.tag} key={tag.tagId} tag={tag} ondrag={handleDragTag} onclick={HandleClickTag} />
                )}
            </div>

            <div className={styles.tags_selecter_options}>
                <button className={styles.tags_selecter_option} onClick={handleCancel}>{t("main.cancel")}</button>
                <button className={styles.tags_selecter_option} onClick={handleConfirm}>{t("main.confirm")}</button>
            </div>

            {draggingTag && draggingPosation &&
                <div
                    className={styles.tags_selecter_dragging_tag}
                    style={{ top: draggingPosation.y, left: draggingPosation.x }}
                >{draggingTag.name}</div>
            }

        </div>
    </div >;
}

export default TagsSelecter;