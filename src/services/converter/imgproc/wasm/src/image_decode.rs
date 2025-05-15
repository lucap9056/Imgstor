use crate::{callback_logs, first_frame::encode_png};
use callback_logs::*;
use image::RgbaImage;
use js_sys::Uint8Array;
use psd::Psd;
use wasm_bindgen::JsError;

pub fn decode_psd(image_data: &[u8], logs: CallbackLogs) -> Result<Uint8Array, JsError> {
    logs("Starting PSD decoding...")?;
    let psd = Psd::from_bytes(image_data)
        .map_err(|e| JsError::new(&format!("Failed to parse PSD: {}", e)))?;

    let width = psd.width();
    let height = psd.height();
    let data = psd.rgba();

    logs("PSD image data parsed successfully.")?;

    match RgbaImage::from_raw(width, height, data) {
        Some(image) => {
            logs("Creating RgbaImage from PSD data.")?;
            encode_png(image)
        }
        None => Err(JsError::new("Failed to create RgbaImage from PSD data (likely incorrect dimensions or data length).")),
    }
}
