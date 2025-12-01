mod animation_encode;
mod callback_logs;
mod detect_animation;
mod first_frame;
mod image_decode;
use animation_encode::*;
use callback_logs::*;
use detect_animation::*;
use first_frame::{apng_first_frame, gif_first_frame, webp_first_frame};
use image_decode::*;
use js_sys::{Boolean, Function, Uint8Array};
use wasm_bindgen::prelude::*;

mod animation_decoder;
use animation_decoder::*;

#[wasm_bindgen(js_name = "WasmDetectAnimation")]
pub fn detect_animation(image_data: &[u8], source_type: &str) -> Result<Boolean, JsError> {
    match source_type.to_lowercase().as_str() {
        "gif" => is_animated_gif(image_data),
        "webp" => is_animated_webp(image_data),
        "png" | "apng" => is_animated_apng(image_data),
        _ => Err(JsError::new(&format!(
            "Not support source type: {}",
            source_type
        ))),
    }
}

#[wasm_bindgen(js_name = "WasmDecodeStaticImage")]
pub fn decode_image(
    image_data: &[u8],
    source_type: &str,
    callback: Function,
) -> Result<Uint8Array, JsError> {
    let logs = callback_log(&callback);
    match source_type.to_lowercase().as_str() {
        "psd" => decode_psd(image_data, logs),
        _ => Err(JsError::new(&format!(
            "Not support source type: {}",
            source_type
        ))),
    }
}

#[wasm_bindgen]
pub struct ConvertedAnimatedImage {
    converted_file: Uint8Array,
    first_frame: Uint8Array,
}

#[wasm_bindgen]
impl ConvertedAnimatedImage {
    #[wasm_bindgen(getter)]
    pub fn first_frame(&self) -> Uint8Array {
        self.first_frame.clone()
    }

    #[wasm_bindgen]
    pub fn converted_file(self) -> Uint8Array {
        self.converted_file
    }
}

#[wasm_bindgen(js_name = "WasmConvertAnimatedImage")]
pub fn convert_animated_image(
    image_data: &[u8],
    source_type: &str,
    target_type: &str,
    callback: Function,
) -> Result<ConvertedAnimatedImage, JsError> {
    let mut logs = callback_log(&callback);

    let mut decoder = animated_image_decode(source_type, image_data, &mut logs)?;

    let first_frame = decoder.first_frame()?;

    let converted_file = match target_type.to_lowercase().as_str() {
        "gif" => encode_gif(decoder, logs),
        "apng" => encode_apng(decoder, logs),
        _ => Err(JsError::new(&format!(
            "Not support target type: {}",
            source_type
        ))),
    }?;

    Ok(ConvertedAnimatedImage {
        converted_file,
        first_frame,
    })
}

fn animated_image_decode<'a>(
    format: &str,
    image_data: &[u8],
    logs: &mut CallbackLogs,
) -> Result<ImgprocFrameDecoder, JsError> {
    let decoder: ImgprocFrameDecoder = match format.to_lowercase().as_str() {
        "apng" => ImgprocApngDecoder::new(image_data, logs)?,
        "gif" => ImgprocGifDecoder::new(image_data, logs)?,
        "webp" => ImgprocWebpDecoder::new(image_data, logs)?,
        _ => {
            return Err(JsError::new(&format!(
                "Not support source type: {}",
                format
            )));
        }
    };

    Ok(decoder)
}

#[wasm_bindgen(js_name = "WasmGetFirstFrame")]
pub fn get_first_frame(image_data: &[u8], source_type: &str) -> Result<Uint8Array, JsError> {
    match source_type.to_lowercase().as_str() {
        "apng" => apng_first_frame(image_data),
        "gif" => gif_first_frame(image_data),
        "webp" => webp_first_frame(image_data),
        _ => Err(JsError::new(&format!(
            "Not support source type: {}",
            source_type
        ))),
    }
}
