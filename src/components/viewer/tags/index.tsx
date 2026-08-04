import { faTags } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImgstor } from "services/imgstor";
import type { ImgstorImage } from "services/imgstor-db";
import type { TagsSelectorEvent } from "services/tags-selector";
import { toast } from "sonner";

import componentStyles from "styles/components.module.scss";
import styles from "./style.module.scss";

interface Props {
  image: ImgstorImage;
}

const Tags: React.FC<Props> = ({ image }) => {
  const componentId = useId();
  const imgstor = useImgstor();
  const loader = useLoader();
  const { t } = useTranslation();
  const [tags, setTags] = useState(
    imgstor.db.GetImageTags(image.imageId, "tagId", "name") || [],
  );

  useEffect(() => {
    const TagsSelectedHandler = async (
      e: TagsSelectorEvent<"TagsSelected">,
    ) => {
      if (e.detail.target !== componentId) return;
      setTags(e.detail.selected);

      const originTags = new Map(
        e.detail.origin.map((tag) => [tag.tagId, tag]),
      );
      const updatedTags = new Map(
        e.detail.selected.map((tag) => [tag.tagId, tag]),
      );

      const appendedTags = e.detail.selected.filter(
        (tag) => !originTags.has(tag.tagId),
      );
      const removedTags = e.detail.origin.filter(
        (tag) => !updatedTags.has(tag.tagId),
      );

      if (appendedTags.length === 0 && removedTags.length === 0) return;

      const loading = loader.append();
      const savingToastId = toast.loading(t("main.saving"));

      try {
        for (const tag of removedTags) {
          imgstor.db.DeleteImageTag(image.imageId, tag.tagId);
        }

        for (const tag of appendedTags) {
          imgstor.db.InsertImageTag(image.imageId, tag.tagId);
        }

        await imgstor.db.Save();
      } catch (err) {
        toast.error((err as Error).message);
      }

      toast.dismiss(savingToastId);
      loading.remove();
    };

    imgstor.tagsSelector.on("TagsSelected", TagsSelectedHandler);
    return () => {
      imgstor.tagsSelector.off("TagsSelected", TagsSelectedHandler);
    };
  }, [componentId, imgstor, image.imageId, loader, t]);

  const handleSelectTags = () => {
    imgstor.tagsSelector.request(componentId, tags);
  };

  return (
    <div className={styles.image_tags} onClick={handleSelectTags}>
      <div className={styles.icon}>
        <FontAwesomeIcon icon={faTags} />
      </div>
      <div className={styles.tags}>
        {tags.map((tag) => (
          <div className={componentStyles.tag} key={tag.tagId}>
            {tag.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tags;
