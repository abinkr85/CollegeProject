import base64
import hmac

from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import BaseModel, field_validator, ValidationError

from config import BATCH_LIMIT, CLIENT_URLS, MAX_TEXT_LENGTH, NLP_REQUIRE_SECRET, RELOAD_SECRET
from src.card_processor import detect_and_crop_id_card
from src.logger import log_prediction
from src.predictor import predictor

app = Flask(__name__)
CORS(app, origins=CLIENT_URLS)


PUBLIC_PATHS = {"/health"}


def validation_errors(error: ValidationError) -> list[dict]:
    return error.errors(include_context=False)


class ClassifyRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("text must not be empty")
        if len(value) > MAX_TEXT_LENGTH:
            raise ValueError(f"text must be under {MAX_TEXT_LENGTH} characters")
        return value.strip()


@app.before_request
def load_models_once():
    if request.method != "OPTIONS" and request.path not in PUBLIC_PATHS and NLP_REQUIRE_SECRET:
        provided_secret = request.headers.get("X-NLP-Secret") or request.headers.get("X-Reload-Secret")

        if not provided_secret or not hmac.compare_digest(provided_secret, RELOAD_SECRET):
            return jsonify({"error": "Unauthorized"}), 401

    if not predictor._loaded:
        predictor.load()


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "models": predictor._loaded,
            "metadata": predictor.metadata,
        }
    )


@app.route("/classify", methods=["POST"])
def classify():
    try:
        body = ClassifyRequest(**request.get_json(force=True))
    except ValidationError as error:
        return jsonify({"error": validation_errors(error)}), 422
    except Exception:
        return jsonify({"error": "Invalid JSON body"}), 400

    try:
        result = predictor.predict(body.text)
        log_prediction(body.text, result)
        return jsonify(result), 200
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503


@app.route("/classify/batch", methods=["POST"])
def classify_batch():
    try:
        data = request.get_json(force=True)
        texts = data.get("texts", [])

        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({"error": "texts must be a non-empty array"}), 422

        if len(texts) > BATCH_LIMIT:
            return jsonify({"error": f"batch limit is {BATCH_LIMIT} texts per request"}), 422

        for text in texts:
            ClassifyRequest(text=text)

        results = predictor.predict_batch(texts)
        for text, result in zip(texts, results):
            log_prediction(text, result)

        return jsonify({"results": results}), 200
    except ValidationError as error:
        return jsonify({"error": validation_errors(error)}), 422
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/explain", methods=["POST"])
def explain():
    try:
        body = ClassifyRequest(**request.get_json(force=True))
        result = predictor.get_top_features(body.text)
        return jsonify(result), 200
    except ValidationError as error:
        return jsonify({"error": validation_errors(error)}), 422
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503


@app.route("/reload", methods=["POST"])
def reload_models():
    secret = request.headers.get("X-Reload-Secret")

    if secret != RELOAD_SECRET:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        predictor.reload()
        return jsonify({"status": "models reloaded", "metadata": predictor.metadata}), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/metadata", methods=["GET"])
def metadata():
    return jsonify(predictor.metadata or {}), 200


@app.route("/card/detect-crop", methods=["POST"])
def detect_crop_card():
    orientation = "vertical"
    image_bytes = None

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        image_data = payload.get("image") or ""
        orientation = payload.get("orientation", "vertical")
        if image_data.startswith("data:"):
            parts = image_data.split(",", 1)
            b64_str = parts[1] if len(parts) > 1 else parts[0]
        else:
            b64_str = image_data

        try:
            image_bytes = base64.b64decode(b64_str)
        except Exception:
            return jsonify({"error": "Invalid base64 image data"}), 400
    elif "image" in request.files:
        image_file = request.files["image"]
        orientation = request.form.get("orientation", "vertical")
        image_bytes = image_file.read()
    else:
        return jsonify({"error": "No image provided in request body or files"}), 400

    if not image_bytes or len(image_bytes) == 0:
        return jsonify({"error": "Empty image payload"}), 400

    try:
        result = detect_and_crop_id_card(image_bytes, orientation=orientation)
        return jsonify(result), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        app.logger.error("Card detection error: %s", exc)
        return jsonify({"error": f"Failed to process card: {str(exc)}"}), 500


@app.route("/idcard_recognition_multi_page", methods=["POST"])
@app.route("/card/detect-crop-multi", methods=["POST"])
def detect_crop_card_multi():
    orientation = "vertical"
    front_bytes = None
    back_bytes = None

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        orientation = payload.get("orientation", "vertical")
        front_raw = payload.get("base64_1") or payload.get("front") or payload.get("image") or ""
        back_raw = payload.get("base64_2") or payload.get("back") or ""

        def decode_b64(val: str) -> bytes | None:
            if not val:
                return None
            clean = val.split(",", 1)[-1] if val.startswith("data:") else val
            try:
                return base64.b64decode(clean)
            except Exception:
                return None

        front_bytes = decode_b64(front_raw)
        back_bytes = decode_b64(back_raw)
    else:
        orientation = request.form.get("orientation", "vertical")
        front_file = request.files.get("file1") or request.files.get("front") or request.files.get("image")
        back_file = request.files.get("file2") or request.files.get("back")
        if front_file:
            front_bytes = front_file.read()
        if back_file:
            back_bytes = back_file.read()

    if not front_bytes:
        return jsonify({"Status": "Front Image Error", "error": "Front image is required"}), 400

    try:
        front_result = detect_and_crop_id_card(front_bytes, orientation=orientation)
        back_result = None
        if back_bytes and len(back_bytes) > 0:
            back_result = detect_and_crop_id_card(back_bytes, orientation=orientation)

        return (
            jsonify(
                {
                    "Status": "Ok",
                    "success": True,
                    "front": front_result,
                    "back": back_result,
                }
            ),
            200,
        )
    except Exception as exc:
        app.logger.error("Multi-page card detection error: %s", exc)
        return jsonify({"Status": "Processing Failed", "error": str(exc)}), 500



try:
    predictor.load()
except Exception as error:
    app.logger.warning("Model preload deferred: %s", error)


if __name__ == "__main__":
    if not predictor._loaded:
        predictor.load()
    app.run(host="0.0.0.0", port=5001, debug=False)
