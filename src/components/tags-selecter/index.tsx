import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Message, MessageButton } from "structs/message";

import { useImgstor } from "services/imgstor";
import { ImgstorTag } from "services/imgstor-db";
import { TagsSelecterEvent } from "services/tags-selecter";

import { useNotifications } from "components/notifications";
import TagItem from "components/tags-selecter/tag-item";
import { useLoadingState } from "components/loading";
import { useAlerts } from "components/alerts";


import styles from "components/tags-selecter/style.module.scss";
import index_styles from "@/index.module.scss";

interface DraggingPosation {
    x: number
    y: number
}

const TagsSelecter: React.FC = () => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const [target, SetTarget] = useState<string>();
    const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>([]);
    const [notusedTags, SetNotusedTags] = useState<ImgstorTag[]>([]);
    const [draggingTag, SetDraggingTag] = useState<ImgstorTag>();
    const [draggingPosation, SetDraggingPosation] = useState<DraggingPosation>();
    const selecter = useRef<HTMLDivElement>(null);
    const selected = useRef<HTMLDivElement>(null);
    const notused = useRef<HTMLDivElement>(null);
    const remove = useRef<HTMLDivElement>(null);

    useEffect(() => {

        const DisplayChangedHandler = (e: TagsSelecterEvent<"DisplayChanged">) => {

            if (e.detail) {
                const { target, tags } = e.detail;
                SetSelectedTags(tags);

                const tagMap: { [key: string]: boolean } = {};
                for (const { tagId } of tags) {
                    tagMap[tagId] = true;
                }

                const notused = imgstor.DB.GetTags().filter(({ tagId }) => tagMap[tagId] === undefined);
                SetNotusedTags(notused);

                SetTarget(target);
            } else {
                SetTarget(undefined);
                if (imgstor.DB.Changed) {
                    (async () => {
                        const loading = loadingState.Append();
                        const saving = new Message({
                            type: Message.Type.NORMAL,
                            content: t("saving")
                        });
                        notifications.Append(saving);
                        try {
                            await imgstor.DB.Save();
                        }
                        catch (err) {
                            notifications.Append(new Message({
                                type: Message.Type.ERROR,
                                content: (err as Error).message
                            }));
                        }
                        finally {
                            saving.Remove();
                            loading.Remove();
                        }
                    })();
                }
            }
        }

        imgstor.TagsSelecter.on("DisplayChanged", DisplayChangedHandler);

        return () => {
            imgstor.TagsSelecter.off("DisplayChanged", DisplayChangedHandler);

        }
    }, []);



    const HandleRemoveTag = (tag: ImgstorTag) => {
        const { tagId, name } = tag;

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {

            if (selectedTags.find(t => t.tagId === tagId)) {
                SetSelectedTags(selectedTags.filter(t => t.tagId !== tagId));
            }

            if (notusedTags.find(t => t.tagId === tagId)) {
                SetNotusedTags(notusedTags.filter(t => t.tagId !== tagId));
            }

            imgstor.DB.DeleteTag(tagId);
        });

        const removeMessage = new Message({
            type: Message.Type.ALERT,
            content: t("tags-selecter.alert.remove-tag", { name }),
            buttons: [
                new MessageButton(t("main.cancel")),
                confirm
            ]
        });
        alerts.Append(removeMessage);
    };

    const HandleSelectTag = ({ tagId }: ImgstorTag) => {
        const tagIndex = notusedTags.findIndex((t) => t.tagId === tagId);
        if (tagIndex === -1) return;
        const notused = notusedTags;
        const tag = notused.splice(tagIndex, 1)[0];

        SetSelectedTags([...selectedTags, tag]);
        SetNotusedTags([...notused]);
    }

    const HandleUnselectTag = ({ tagId }: ImgstorTag) => {
        const tagIndex = selectedTags.findIndex((t) => t.tagId === tagId);
        if (tagIndex === -1) return;
        const selected = selectedTags;
        const tag = selected.splice(tagIndex, 1)[0];

        SetNotusedTags([...notusedTags, tag]);
        SetSelectedTags([...selected]);
    }


    useEffect(() => {

        const container = selecter.current;
        const select = selected.current;
        if (!container || !select) return;

        const HandleDragEnd = (e: MouseEvent | TouchEvent) => {
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

                if (isInSelected) HandleSelectTag(draggingTag);
                if (isInNotused) HandleUnselectTag(draggingTag);
                if (isInRemove) HandleRemoveTag(draggingTag);
            }

            SetDraggingPosation(undefined);
            SetDraggingTag(undefined);
        }



        const HandlePointMove = (e: MouseEvent | TouchEvent) => {
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

            SetDraggingPosation({ x, y });
        };

        if (draggingTag) {
            window.addEventListener("mouseup", HandleDragEnd);
            window.addEventListener("touchend", HandleDragEnd);

            container.addEventListener("mouseleave", HandleDragEnd);

            container.addEventListener("mousemove", HandlePointMove);
            container.addEventListener("touchmove", HandlePointMove);



        } else {
            SetDraggingPosation(undefined);
        }


        return () => {
            window.removeEventListener("mouseup", HandleDragEnd);
            window.removeEventListener("touchend", HandleDragEnd);

            container.removeEventListener("mouseleave", HandleDragEnd);

            container.removeEventListener("mousemove", HandlePointMove);
            container.removeEventListener("touchmove", HandlePointMove);
        }
    }, [draggingTag]);

    const HandleCreateTag = (e: React.FormEvent<HTMLFormElement>) => {
        const target = e.target as HTMLFormElement;
        e.stopPropagation();
        e.preventDefault();

        const form = new FormData(target);
        const name = (form.get("tag_name") || "").toString();

        if (name === "") return;

        target.reset();

        const tagId = imgstor.DB.InsertTag(name);
        const tag: ImgstorTag = { tagId, name };

        SetSelectedTags([...selectedTags, tag]);
    }

    const HandleDragTag = (tag: ImgstorTag) => {
        SetDraggingTag(tag);
    }

    const HandleClickTag = (tag: ImgstorTag) => {

        if (selectedTags.find((t) => t.tagId === tag.tagId)) {
            HandleUnselectTag(tag);
        } else {
            HandleSelectTag(tag);
        }

    }

    const HandleCancel = () => {
        imgstor.TagsSelecter.Selected();
    }

    const HandleConfirm = () => {
        imgstor.TagsSelecter.Selected(selectedTags);
    }

    if (target === undefined) {
        return <></>;
    }

    return <div className={styles.tags_selecter_container}>
        <div className={styles.tags_selecter} ref={selecter}>
            <div className={styles.tags_selecter_selected_tags} ref={selected}>
                {selectedTags.map(
                    (tag) => <TagItem className={styles.tags_selecter_selected_tag} key={tag.tagId} tag={tag} ondrag={HandleDragTag} onclick={HandleClickTag} />
                )}
            </div>

            <div className={styles.tags_selecter_tag_options}>

                <form className={styles.tags_selecter_tag_option} onSubmit={HandleCreateTag}>

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
                    (tag) => <TagItem className={styles.tags_selecter_not_used_tag} key={tag.tagId} tag={tag} ondrag={HandleDragTag} onclick={HandleClickTag} />
                )}
            </div>

            <div className={styles.tags_selecter_options}>
                <div className={`${styles.tags_selecter_option} ${index_styles.button}`} onClick={HandleCancel}>{t("main.cancel")}</div>
                <div className={`${styles.tags_selecter_option} ${index_styles.button}`} onClick={HandleConfirm}>{t("main.confirm")}</div>
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