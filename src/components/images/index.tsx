/**
 * 主要圖片顯示
 */
import React, { useEffect, useState } from 'react';
import cookies from "js-cookie";

import { ImgstorEvent, SearchContent, useImgstor } from 'services/imgstor';
import { ImgstorImage, ImgstorImageSort as Sort } from 'services/imgstor-db';

import ImageComponenet from './image';
import { useLoadingState } from 'components/loading';

import styles from "components/images/style.module.scss";

const enum SEARCH {
    LIMIT = 30
}

const enum IMAGE {
    BASE_WIDTH = 160
}

function GetColumnCount(): number {
    return Math.floor(document.documentElement.clientWidth / IMAGE.BASE_WIDTH);
}

const Images: React.FC = () => {
    const loadingState = useLoadingState();
    const imgstor = useImgstor();
    const [images, SetImages] = useState<ImgstorImage[]>(imgstor.DB.GetImages());
    const [searchContent, SetSearchContent] = useState<SearchContent>({
        title: "",
        tags: [],
        sort: cookies.get("sort") as Sort || ImgstorImage.SORT.DEFAULT
    });
    const [latestUpload, SetLatestUpload] = useState(0);
    const [searchOffset, SetSearchOffset] = useState(0);
    const [hasMoreImages, SetHasMoreImages] = useState(false);
    const [columnCount, SetColumnCount] = useState(GetColumnCount());
    const [shouldRender, SetShouldRender] = useState(true);
    const [resizeTimeoutId, SetResizeTimeoutId] = useState<NodeJS.Timeout | null>(null);


    useEffect(() => {
        const { title, sort } = searchContent;

        const tags = searchContent.tags.map((t) => t.tagId);

        const loading = loadingState.Append();

        try {
            const searchResult = imgstor.DB.SearchImages({
                include: ["imageId", "title", "width", "height", "imageUrl", "previewUrl", "hostingServiceId"], tags, sort,
                filters: (title === "") ? undefined : { title },
                limit: SEARCH.LIMIT,
                offset: searchOffset,
            });

            const newImages = (searchOffset === 0) ? searchResult : [...images, ...searchResult];
            SetHasMoreImages(newImages.length % SEARCH.LIMIT !== 0);
            SetImages(newImages);
        }
        catch (err) {
            console.error(err);
            SetHasMoreImages(false);
            SetImages([]);
        }

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
            SetShouldRender(false);

            if (resizeTimeoutId) {
                clearTimeout(resizeTimeoutId);
            }

            const timeoutId = setTimeout(() => {
                SetColumnCount(GetColumnCount());
                SetShouldRender(true);
            }, 300);

            SetResizeTimeoutId(timeoutId);

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
        <div className={styles.images}>

            <style>
                {`
                :root {
                    --image-column-count:${columnCount};
                }`}
            </style>

            <div className={styles.images_main}>
                {shouldRender && images.map(
                    (image, i, images) => {
                        const onload = (hasMoreImages && i + 1 === images.length) ? HandleLoadMoreIamges : undefined;
                        return <ImageComponenet key={image.imageId + image.title} image={image} onload={onload} />;
                    }
                )}
            </div>
        </div>
    </>
}

export default Images;