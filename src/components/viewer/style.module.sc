.viewer_container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: $light-background-color;
    z-index: 1;
    overflow-y: auto;

    .viewer {
        position: relative;
        width: 50rem;
        margin: auto;
        display: flex;
        flex-flow: row;
        gap: 1.25rem;

        @media (max-width: 48rem) {
            width: 100%;
            padding: 1.25rem 1.25rem 4.5rem;
        }

        .viewer_main {
            display: flex;
            flex-flow: column;
            gap: 0.625rem;
            flex: 1;

            .viewer_title_edit {
                background-color: #6b53e0;
                border-radius: 0.3125rem;
                color: #fff;
                outline: none;
                line-height: 1.5rem;
                font-size: 1.5rem;
                border: none;
                padding: 0.125rem 0.625rem;
            }

            .image {
                position: relative;
                display: flex;
                max-height: 80vh;
                transition-duration: 125ms;

                @media (max-width: 48rem) {
                    position: relative;
                    display: flex;
                    flex-flow: column;
                    gap: 0.625rem;
                    max-height: unset;
                }

                img {
                    overflow: hidden;
                    flex: 1;
                    filter: blur(1rem);
                    object-fit: contain;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transition-duration: 250ms;
                    background-size: 1rem 1rem;
                    background-image: repeating-conic-gradient(transparent 0 25%, #cfcfcf 0 50%);
                    background-color: #fff;

                    @media (max-width: 48rem) {
                        flex: none;
                        object-fit: contain;
                    }
                }

                &[data-loaded="true"] {
                    img {
                        opacity: 1;
                        filter: unset;
                    }
                }

                &[data-loaded="false"]::before {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border-style: solid;
                    border-width: 0.15rem;
                    border-color: #fff transparent #ffffff42 #ffffffb5;
                    border-radius: 100%;
                    width: 4rem;
                    height: 4rem;
                    animation: rotate 1s infinite linear;

                    @keyframes rotate {
                        0% {
                            transform: translate(-50%, -50%) rotate(0deg);
                        }

                        100% {
                            transform: translate(-50%, -50%) rotate(360deg);
                        }
                    }
                }
            }

            .description,
            .image_tags {
                position: relative;
                border-radius: 8px;
                background: #f4f6fb;
                overflow: auto;
                display: flex;
                flex-flow: row;
                box-shadow: 1px 1px 3px 3px #5b5b5b99;

                .icon {
                    width: 1.5rem;
                    overflow: hidden;
                    background: #87b8f6;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
            }

            .description {

                textarea {
                    flex: 1;
                    margin: 0.5rem;
                    background: transparent;
                    line-height: 1.125rem;
                    font-size: 1rem;
                    border: none;
                    outline: none;
                    padding: 0;
                    height: 1.125rem;
                    overflow: auto;
                    min-height: 2.25rem;
                    max-height: 5.625rem;
                    resize: none;

                    &:read-only {
                        caret-color: transparent;
                    }
                }

            }

            .image_tags {
                .tags {
                    position: relative;
                    min-height: 1.625rem;
                    flex: 1;

                    .tag {
                        user-select: none;
                        position: relative;
                        padding: 0 0.3125rem;
                        background-color: #f6f2f0;
                        border-radius: 4px;
                        font-size: 0.8125rem;
                        float: left;
                        margin: 0.125rem;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        border: solid 2px #9397be;
                        color: #6b8ae7;
                        font-weight: bold;
                        cursor: pointer;
                    }
                }
            }

            .title,
            .description {

                .edit {
                    position: absolute;
                    bottom: 0.5rem;
                    right: 0.5rem;
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                }
            }
        }

        .viewer_options {
            display: flex;
            flex-flow: column;
            gap: 0.625rem;
            width: 12.5rem;

            @media (max-width: 48rem) {
                position: absolute;
                flex-flow: row;
                bottom: 0.75rem;
                height: 3rem;
                width: unset;
                left: 0;
                right: 0;
                padding: 0 1.25rem;
            }

            .viewer_option {
                position: relative;
                list-style: none;
                background-color: #3b21b8;
                border-radius: 0.3125rem;
                font-size: 1rem;
                display: flex;
                flex-flow: row;
                align-items: center;
                gap: 0.625rem;
                transition-duration: 0.125s;
                padding: 0.25rem 0.625rem;
                line-height: 1.25rem;

                &:hover {
                    background-color: #36229e;
                }

                &:active {
                    background-color: #25137e;
                }

                ion-icon {
                    font-size: 1.5rem;
                }

                &::after {
                    content: attr(data-text);
                }

                @media (max-width: 48rem) {
                    flex: 1;
                    justify-content: center;

                    &::after {
                        display: none;
                    }
                }
            }
        }
    }
}