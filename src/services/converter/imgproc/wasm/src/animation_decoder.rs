use image::{
    codecs::{gif::GifDecoder, png::PngDecoder, webp::WebPDecoder},
    AnimationDecoder, Frame, ImageBuffer, Rgba,
};
use js_sys::Uint8Array;
use std::{io::Cursor, vec::IntoIter};
use wasm_bindgen::JsError;

use crate::{callback_logs::CallbackLogs, first_frame::encode_png};

pub type ImgprocFrameDecoder = Box<dyn FrameDecoder>;

pub trait FrameDecoder {
    fn new(image_data: &[u8], logs: &mut CallbackLogs) -> Result<Box<Self>, JsError>
    where
        Self: Sized;
    fn width(&self) -> u32;
    fn height(&self) -> u32;
    fn num_frames(&self) -> u32;
    fn next_frame(&mut self) -> Option<(ImageBuffer<Rgba<u8>, Vec<u8>>, u32)>;
    fn first_frame(&mut self) -> Result<Uint8Array, JsError>;
}

pub struct ImgprocApngDecoder {
    frames: IntoIter<Frame>,
    width: u32,
    height: u32,
    num_frames: u32,
    first_frame: Option<Uint8Array>,
}

impl FrameDecoder for ImgprocApngDecoder {
    fn new(image_data: &[u8], logs: &mut CallbackLogs) -> Result<Box<Self>, JsError> {
        logs("Decoding APNG image...")?;
        let cursor = Cursor::new(image_data);
        let png_decoder = match PngDecoder::new(cursor) {
            Ok(decoder) => decoder,
            Err(_) => return Err(JsError::new("Failed to create PNG decoder for APNG.")),
        };
        
        let decoder = match png_decoder.apng() {
            Ok(decoder) => decoder,
            Err(_) => return Err(JsError::new("Failed to decode APNG.")),
        };

        let mut frames: Vec<Frame> = Vec::new();

        let mut width = 0;
        let mut height = 0;

        let mut num_frames = 0;
        let mut first_frame = Uint8Array::new_with_length(0);
        for frame_result in decoder.into_frames() {
            match frame_result {
                Ok(frame) => {
                    if num_frames == 0 {
                        let image = frame.buffer();
                        width = image.width();
                        height = image.height();
                        first_frame = encode_png(image.clone())?;
                        logs("Successfully encoded the first frame as PNG.")?;
                    }
                    frames.push(frame);
                    num_frames += 1;
                }
                Err(_) => return Err(JsError::new("Failed to decode a GIF frame.")),
            }
        }

        logs(format!("Decoded {} APNG frames.", num_frames).as_str())?;

        Ok(Box::new(ImgprocApngDecoder {
            frames: frames.into_iter(),
            width,
            height,
            num_frames,
            first_frame: Some(first_frame),
        }))
    }

    fn width(&self) -> u32 {
        self.width
    }

    fn height(&self) -> u32 {
        self.height
    }

    fn num_frames(&self) -> u32 {
        self.num_frames
    }

    fn next_frame(&mut self) -> Option<(ImageBuffer<Rgba<u8>, Vec<u8>>, u32)> {
        match self.frames.next() {
            Some(frame) => {
                let delay = frame.delay().numer_denom_ms().0;
                let image_data = frame.into_buffer();
                Some((image_data, delay))
            }
            None => None,
        }
    }

    fn first_frame(&mut self) -> Result<Uint8Array, JsError> {
        match self.first_frame.take() {
            Some(first_frame) => Ok(first_frame),
            None => Err(JsError::new("First frame of APNG not available.")),
        }
    }
}

pub struct ImgprocGifDecoder {
    frames: IntoIter<Frame>,
    width: u32,
    height: u32,
    num_frames: u32,
    first_frame: Option<Uint8Array>,
}

impl FrameDecoder for ImgprocGifDecoder {
    fn new(image_data: &[u8], logs: &mut CallbackLogs) -> Result<Box<Self>, JsError> {
        logs("Decoding GIF image...")?;
        let cursor = Cursor::new(image_data);
        let gif_decoder = match GifDecoder::new(cursor) {
            Ok(decoder) => decoder,
            Err(_) => return Err(JsError::new("Failed to create GIF decoder.")),
        };

        let mut frames: Vec<Frame> = Vec::new();

        let mut width = 0;
        let mut height = 0;

        let mut num_frames = 0;
        let mut first_frame = Uint8Array::new_with_length(0);
        for frame_result in gif_decoder.into_frames() {
            match frame_result {
                Ok(frame) => {
                    if num_frames == 0 {
                        let image = frame.buffer();
                        width = image.width();
                        height = image.height();
                        first_frame = encode_png(image.clone())?;
                        logs("Successfully encoded the first GIF frame as PNG.")?;
                    }
                    frames.push(frame);
                    num_frames += 1;
                }
                Err(_) => return Err(JsError::new("Failed to decode a GIF frame.")),
            }
        }

        logs(format!("Decoded {} GIF frames.", num_frames).as_str())?;

        Ok(Box::new(ImgprocGifDecoder {
            frames: frames.into_iter(),
            width,
            height,
            num_frames,
            first_frame: Some(first_frame),
        }))
    }

    fn width(&self) -> u32 {
        self.width
    }

    fn height(&self) -> u32 {
        self.height
    }

    fn num_frames(&self) -> u32 {
        self.num_frames
    }

    fn next_frame(&mut self) -> Option<(ImageBuffer<Rgba<u8>, Vec<u8>>, u32)> {
        match self.frames.next() {
            Some(frame) => {
                let delay = frame.delay().numer_denom_ms().0 * 10;
                let image_data = frame.into_buffer();
                Some((image_data, delay))
            }
            None => None,
        }
    }

    fn first_frame(&mut self) -> Result<Uint8Array, JsError> {
        match self.first_frame.take() {
            Some(first_frame) => Ok(first_frame),
            None => Err(JsError::new("First frame of GIF not available.")),
        }
    }
}

pub struct ImgprocWebpDecoder {
    frames: IntoIter<Frame>,
    width: u32,
    height: u32,
    num_frames: u32,
    first_frame: Option<Uint8Array>,
}

impl FrameDecoder for ImgprocWebpDecoder {
    fn new(image_data: &[u8], logs: &mut CallbackLogs) -> Result<Box<Self>, JsError> {
        logs("Decoding WebP image...")?;
        let cursor = Cursor::new(image_data);
        let webp_decoder = match WebPDecoder::new(cursor) {
            Ok(decoder) => decoder,
            Err(_) => return Err(JsError::new("Failed to create WebP decoder.")),
        };

        let mut frames: Vec<Frame> = Vec::new();

        let mut width = 0;
        let mut height = 0;

        let mut num_frames = 0;
        let mut first_frame = Uint8Array::new_with_length(0);
        for frame_result in webp_decoder.into_frames() {
            match frame_result {
                Ok(frame) => {
                    if num_frames == 0 {
                        let image = frame.buffer();
                        width = image.width();
                        height = image.height();
                        first_frame = encode_png(image.clone())?;
                        logs("Successfully encoded the first WebP frame as PNG.")?;
                    }
                    frames.push(frame);
                    num_frames += 1;
                }
                Err(_) => return Err(JsError::new("Failed to decode a WebP frame.")),
            }
        }

        logs(format!("Decoded {} WebP frames.", num_frames).as_str())?;

        Ok(Box::new(ImgprocWebpDecoder {
            frames: frames.into_iter(),
            width,
            height,
            num_frames,
            first_frame: Some(first_frame),
        }))
    }

    fn width(&self) -> u32 {
        self.width
    }

    fn height(&self) -> u32 {
        self.height
    }

    fn num_frames(&self) -> u32 {
        self.num_frames
    }

    fn next_frame(&mut self) -> Option<(ImageBuffer<Rgba<u8>, Vec<u8>>, u32)> {
        match self.frames.next() {
            Some(frame) => {
                let delay = frame.delay().numer_denom_ms().0;
                let image_data = frame.into_buffer();
                Some((image_data, delay))
            }
            None => None,
        }
    }

    fn first_frame(&mut self) -> Result<Uint8Array, JsError> {
        match self.first_frame.take() {
            Some(first_frame) => Ok(first_frame),
            None => Err(JsError::new("First frame of WebP not available.")),
        }
    }
}
