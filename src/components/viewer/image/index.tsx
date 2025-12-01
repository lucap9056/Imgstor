import React, { useState } from "react";

import { ImgstorImage } from "services/imgstor-db";

import styles from "./style.module.scss";

interface Props {
    image: ImgstorImage
}

const Image: React.FC<Props> = ({ image }) => {
    const [aspectRatio, setAspectRatio] = useState(`${image.width}/${image.height}`);
    const [loaded, setLoaded] = useState(false);

    const loadHandler = (e: React.UIEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setAspectRatio(`${width}/${height}`);
        setLoaded(true);
    }

    const errorHandler = () => {

    }

    return <div className={styles.image} style={{ aspectRatio }} data-loaded={loaded}>
        <img alt='' onError={errorHandler} onLoad={loadHandler} src={image.imageUrl} />
    </div>;
}

export default Image;