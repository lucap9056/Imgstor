/**
 * 主要圖片顯示
 */
import React, { useEffect, useState } from 'react';
import cookies from "js-cookie";

import Imgstor, { ImgstorEvent, SearchContent } from 'services/imgstor';
import { ImgstorImage, ImgstorImageSort as Sort } from 'services/imgstor-db';

import ImageComponenet, { BASE_WIDTH } from './image';
import { loadingManager } from 'components/loading';

import styles from "components/images/style.module.scss";

const enum SEARCH {
    LIMIT = 30
}

interface Props {
    imgstor: Imgstor
}

function GetGridTemplateColumns() {
    return `repeat(${Math.floor(document.documentElement.clientWidth / BASE_WIDTH)}, 1fr)`;
}

const Images: React.FC<Props> = ({ imgstor }) => {
    const [images, SetImages] = useState<ImgstorImage[]>(imgstor.DB.GetImages());
    const [searchContent, SetSearchContent] = useState<SearchContent>({
        title: "",
        tags: [],
        sort: cookies.get("sort") as Sort || ImgstorImage.SORT.DEFAULT
    });
    const [latestUpload, SetLatestUpload] = useState(0);
    const [searchOffset, SetSearchOffset] = useState(0);
    const [hasMoreImages, SetHasMoreImages] = useState(false);
    const [gridTemplateColumns, SetGridColumns] = useState(GetGridTemplateColumns());

    useEffect(() => {
        const { title, sort } = searchContent;

        const tags = searchContent.tags.map((t) => t.id);

        const loading = loadingManager.Append();

        const searchResult = imgstor.DB.SearchImages({
            include: ["id", "title", "width", "height", "link", "preview", "hosting_service"], tags, sort,
            filters: (title === "") ? undefined : { title },
            limit: SEARCH.LIMIT,
            offset: searchOffset,
        });

        const newImages = (searchOffset === 0) ? searchResult : [...images, ...searchResult];
        SetHasMoreImages(newImages.length % SEARCH.LIMIT === 0);
        SetImages(newImages);

        loading.Remove();

    }, [searchContent, searchOffset, latestUpload]);

    useEffect(() => {
        const ImageSearchChangedHandler = (e: ImgstorEvent<"ImageSearchChanged">) => {
            SetSearchContent(e.detail);
            SetSearchOffset(0);
        };

        const ImageUpdatedHandler = () => {
            const t = new Date().getTime();
            SetLatestUpload(t);
            SetSearchOffset(0);
        }

        const WindowResizeHandler = () => {
            SetGridColumns(GetGridTemplateColumns());
        };

        imgstor.DB.on("ImageUpdated", ImageUpdatedHandler);
        imgstor.on("ImageSearchChanged", ImageSearchChangedHandler);
        window.addEventListener("resize", WindowResizeHandler);

        return () => {
            imgstor.DB.off("ImageUpdated", ImageUpdatedHandler);
            imgstor.off("ImageSearchChanged", ImageSearchChangedHandler);
            window.removeEventListener("resize", WindowResizeHandler);
        }
    }, []);


    const HandleLoadMoreIamges = () => {
        SetSearchOffset(searchOffset + images.length);
    }

    return <>
        <div className={styles.images_container} style={{ gridTemplateColumns }}>
            {images.map(
                (image, i, images) => {
                    const onload = (hasMoreImages && i + 1 === images.length) ? HandleLoadMoreIamges : undefined;
                    return <ImageComponenet key={image.id + image.title} imgstor={imgstor} image={image} onload={onload} />;
                }
            )}
        </div>
    </>
}

export default Images;