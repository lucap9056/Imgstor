use image::{
    codecs::{gif::GifDecoder, png::PngDecoder, webp::WebPDecoder},
    AnimationDecoder, RgbaImage,
};
use js_sys::Uint8Array;
use png::{self, Encoder};
use std::io::Cursor;
use wasm_bindgen::JsError;

pub fn apng_first_frame(image_data: &[u8]) -> Result<Uint8Array, JsError> {
    let cursor = Cursor::new(image_data);
    let decoder = match PngDecoder::new(cursor) {
        Ok(d) => d,
        Err(e) => {
            return Err(JsError::new(&format!(
                "Failed to create PNG decoder: {}",
                e
            )))
        }
    };

    let apng_decoder = match decoder.apng() {
        Ok(d) => d,
        Err(_) => return Err(JsError::new("The provided image is not a valid APNG.")),
    };

    let first_frame = match apng_decoder.into_frames().next() {
        Some(frmae_result) => frmae_result?,
        None => {
            return Err(JsError::new(&format!("Failed to decode a apng frame")));
        }
    };

    let first_image = first_frame.into_buffer();

    encode_png(first_image)
}

pub fn gif_first_frame(image_data: &[u8]) -> Result<Uint8Array, JsError> {
    let cursor = Cursor::new(image_data);
    let decoder = match GifDecoder::new(cursor) {
        Ok(d) => d,
        Err(e) => {
            return Err(JsError::new(&format!(
                "Failed to create Gif decoder: {}",
                e
            )))
        }
    };

    let first_frame = match decoder.into_frames().next() {
        Some(frame_result) => frame_result?,
        None => {
            return Err(JsError::new(&format!("Failed to decode a gif frame")));
        }
    };

    let first_image = first_frame.into_buffer();

    encode_png(first_image)
}

pub fn webp_first_frame(image_data: &[u8]) -> Result<Uint8Array, JsError> {
    let cursor = Cursor::new(image_data);
    let decoder = match WebPDecoder::new(cursor) {
        Ok(d) => d,
        Err(e) => {
            return Err(JsError::new(&format!(
                "Failed to create WebP decoder: {}",
                e
            )))
        }
    };

    let first_frame = match decoder.into_frames().next() {
        Some(frame_result) => frame_result?,
        None => {
            return Err(JsError::new(&format!("Failed to decode a webp frame")));
        }
    };

    let first_image = first_frame.into_buffer();

    encode_png(first_image)
}

pub fn encode_png(image: RgbaImage) -> Result<Uint8Array, JsError> {
    let width = image.width();
    let height = image.height();
    let mut output = Vec::new();
    let mut encoder = Encoder::new(&mut output, width, height);

    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Fast);
    encoder.set_filter(png::FilterType::Sub);

    let mut writer = match encoder.write_header() {
        Ok(w) => w,
        Err(e) => return Err(JsError::new(&format!("Failed to write PNG header: {}", e))),
    };

    match writer.write_image_data(&image.into_raw()) {
        Ok(_) => {}
        Err(e) => return Err(JsError::new(&format!("Failed to write image data: {}", e))),
    }

    match writer.finish() {
        Ok(_) => Ok(Uint8Array::from(output.as_slice())),
        Err(e) => Err(JsError::new(&format!(
            "Failed to finalize PNG encoding: {}",
            e
        ))),
    }
}
