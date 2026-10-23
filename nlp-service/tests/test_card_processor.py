import cv2
import numpy as np
import pytest
from src.card_processor import detect_and_crop_id_card, order_points


def test_order_points_standard_quad():
    pts = np.array([[100, 200], [10, 15], [105, 12], [8, 195]], dtype="float32")
    ordered = order_points(pts)
    assert np.allclose(ordered[0], [10, 15])  # top-left
    assert np.allclose(ordered[1], [105, 12])  # top-right
    assert np.allclose(ordered[2], [100, 200])  # bottom-right
    assert np.allclose(ordered[3], [8, 195])  # bottom-left


def test_detect_and_crop_id_card_synthetic_rect():
    # Create 800x1200 dark background image
    img = np.zeros((800, 1200, 3), dtype=np.uint8)
    img[:] = (20, 20, 20)  # dark background

    # Draw a bright rotated ID card polygon in the center
    # Card corners: approx 350x550 aspect
    card_pts = np.array([[300, 150], [850, 180], [810, 700], [260, 670]], dtype=np.int32)
    cv2.fillPoly(img, [card_pts], (230, 230, 230))  # light card color
    # Add text-like pattern
    cv2.putText(img, "STUDENT ID", (400, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, (10, 10, 10), 2)

    _, buf = cv2.imencode(".jpg", img)
    result = detect_and_crop_id_card(buf.tobytes(), orientation="vertical")

    assert result["success"] is True
    assert result["detected"] is True
    assert result["width"] > 0
    assert result["height"] > 0
    assert result["image"].startswith("data:image/jpeg;base64,")


def test_detect_and_crop_id_card_fallback_on_blank():
    # Completely uniform image where no contour is discernible
    img = np.full((600, 600, 3), 128, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)

    result = detect_and_crop_id_card(buf.tobytes(), orientation="vertical")
    assert result["success"] is True
    assert result["detected"] is False  # Used clean fallback crop
    assert result["image"].startswith("data:image/jpeg;base64,")


def test_detect_and_crop_invalid_bytes_raises():
    with pytest.raises(ValueError):
        detect_and_crop_id_card(b"not-an-image")


def test_api_detect_crop_endpoint():
    from app import app
    from config import RELOAD_SECRET

    client = app.test_client()

    # Create synthetic image
    img = np.full((400, 400, 3), 200, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    import base64
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    # Call endpoint with X-NLP-Secret
    resp = client.post(
        "/card/detect-crop",
        json={"image": f"data:image/jpeg;base64,{b64}", "orientation": "vertical"},
        headers={"X-NLP-Secret": RELOAD_SECRET},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "image" in data
    assert data["image"].startswith("data:image/jpeg;base64,")
