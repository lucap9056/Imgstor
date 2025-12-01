use js_sys::Function;
use wasm_bindgen::{JsError, JsValue};

pub type CallbackLogs<'a> = Box<dyn Fn(&str) -> Result<(), JsError> + 'a>;

pub fn callback_log(f: &Function) -> CallbackLogs {
    Box::new(
        move |s| match f.call1(&JsValue::null(), &JsValue::from_str(s)) {
            Ok(_) => Ok(()),
            Err(_) => Err(JsError::new(s)),
        },
    )
}
