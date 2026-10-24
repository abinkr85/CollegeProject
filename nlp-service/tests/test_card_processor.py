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
    # Card corners: approx 350x550 aspect (~1.571)
    card_pts = np.array([[420, 150], [770, 170], [740, 720], [390, 700]], dtype=np.int32)
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


def test_api_detect_crop_multi_page_endpoint():
    from app import app
    from config import RELOAD_SECRET

    client = app.test_client()

    img = np.full((400, 400, 3), 200, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    import base64
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    resp = client.post(
        "/idcard_recognition_multi_page",
        json={
            "base64_1": f"data:image/jpeg;base64,{b64}",
            "base64_2": f"data:image/jpeg;base64,{b64}",
            "orientation": "vertical",
        },
        headers={"X-NLP-Secret": RELOAD_SECRET},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["Status"] == "Ok"
    assert data["success"] is True
    assert data["front"]["image"].startswith("data:image/jpeg;base64,")
    assert data["back"]["image"].startswith("data:image/jpeg;base64,")



def test_is_valid_card_polygon_rejects_non_card_shapes():
    from src.card_processor import is_valid_card_polygon

    frame_area = 1000 * 1000  # 1,000,000 px^2

    # Case 1: Square shape (aspect ratio = 1.0 like blanket patterns/tiles) -> REJECT
    square_pts = np.array([[[100, 100]], [[500, 100]], [[500, 500]], [[100, 500]]], dtype=np.int32)
    valid, ar = is_valid_card_polygon(square_pts, frame_area)
    assert valid is False
    assert abs(ar - 1.0) < 0.1

    # Case 2: Too small contour (< 15% of frame) -> REJECT
    small_card = np.array([[[100, 100]], [[200, 100]], [[200, 260]], [[100, 260]]], dtype=np.int32)
    valid, _ = is_valid_card_polygon(small_card, frame_area)
    assert valid is False

    # Case 3: Too long strip (aspect ratio > 2.5) -> REJECT
    strip_pts = np.array([[[50, 50]], [[900, 50]], [[900, 150]], [[50, 150]]], dtype=np.int32)
    valid, _ = is_valid_card_polygon(strip_pts, frame_area)
    assert valid is False

    # Case 4: Non-4 corners (Triangle - 3 corners) -> REJECT
    triangle_pts = np.array([[[100, 100]], [[500, 100]], [[300, 500]]], dtype=np.int32)
    valid, _ = is_valid_card_polygon(triangle_pts, frame_area)
    assert valid is False

    # Case 5: Valid CR80 card (ratio ~ 1.58, area ~ 35%) -> ACCEPT
    # 400 width x 635 height = ratio 1.587, area = 254,000 (25.4% of frame)
    valid_card = np.array([[[200, 150]], [[600, 150]], [[600, 785]], [[200, 785]]], dtype=np.int32)
    valid, ar = is_valid_card_polygon(valid_card, frame_area)
    assert valid is True
    assert 1.55 <= ar <= 1.62

    # Case 6: Skewed rhombus with non-orthogonal acute/obtuse angles (e.g. blanket folds) -> REJECT
    rhombus_pts = np.array([[[200, 100]], [[700, 100]], [[500, 700]], [[0, 700]]], dtype=np.int32)
    valid, _ = is_valid_card_polygon(rhombus_pts, frame_area)
    assert valid is False

