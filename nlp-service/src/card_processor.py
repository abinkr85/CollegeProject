import base64
import cv2
import numpy as np


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders 4 points in clockwise order:
    [top-left, top-right, bottom-right, bottom-left]
    """
    rect = np.zeros((4, 2), dtype="float32")

    # top-left has smallest sum, bottom-right has largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    # top-right has smallest diff (y - x), bottom-left has largest diff
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray, orientation: str = "vertical") -> np.ndarray:
    """
    Performs perspective warping on the 4-corner polygon to extract a flat rectangle.
    """
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Width of the new image
    width_a = np.hypot(br[0] - bl[0], br[1] - bl[1])
    width_b = np.hypot(tr[0] - tl[0], tr[1] - tl[1])
    max_width = max(int(width_a), int(width_b))

    # Height of the new image
    height_a = np.hypot(tr[0] - br[0], tr[1] - br[1])
    height_b = np.hypot(tl[0] - bl[0], tl[1] - bl[1])
    max_height = max(int(height_a), int(height_b))

    # Standard CR80 ID Card Aspect Ratio = 85.6mm x 53.98mm ~= 1.586
    card_aspect = 1.586

    if orientation == "vertical":
        target_w = max(480, min(900, max_width))
        target_h = int(target_w * card_aspect)
    else:
        target_w = max(760, min(1400, max_width))
        target_h = int(target_w / card_aspect)

    dst = np.array(
        [
            [0, 0],
            [target_w - 1, 0],
            [target_w - 1, target_h - 1],
            [0, target_h - 1],
        ],
        dtype="float32",
    )

    m = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, m, (target_w, target_h), flags=cv2.INTER_LANCZOS4)
    return warped


def enhance_card_image(image: np.ndarray) -> np.ndarray:
    """
    Normalizes lighting and enhances text contrast using CLAHE in LAB color space.
    """
    try:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    except Exception:
        return image


def detect_and_crop_id_card(image_bytes: bytes, orientation: str = "vertical") -> dict:
    """
    Detects card boundary via Canny edge detection & contour polygon approximation,
    deskews using perspective transform, enhances contrast, and returns base64 JPEG.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode image from provided payload")

    orig_h, orig_w = image.shape[:2]

    # Resize to standard working resolution for consistent contour detection
    max_work_dim = 1000
    if max(orig_h, orig_w) > max_work_dim:
        scale = max_work_dim / max(orig_h, orig_w)
        work_w, work_h = int(orig_w * scale), int(orig_h * scale)
        resized = cv2.resize(image, (work_w, work_h), interpolation=cv2.INTER_AREA)
    else:
        scale = 1.0
        resized = image.copy()

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection
    edged = cv2.Canny(blurred, 35, 120)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    frame_area = resized.shape[0] * resized.shape[1]
    card_contour = None

    for c in contours[:10]:
        area = cv2.contourArea(c)
        if area < 0.10 * frame_area:
            break

        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.025 * peri, True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            card_contour = approx
            break

    detected = False
    if card_contour is not None:
        pts = card_contour.reshape(4, 2) / scale
        warped = four_point_transform(image, pts, orientation=orientation)
        detected = True
    else:
        # Fallback: Center crop matching the card aspect ratio
        card_aspect = 1.586
        if orientation == "vertical":
            crop_h = int(orig_h * 0.88)
            crop_w = int(crop_h / card_aspect)
            if crop_w > orig_w:
                crop_w = int(orig_w * 0.88)
                crop_h = int(crop_w * card_aspect)
        else:
            crop_w = int(orig_w * 0.88)
            crop_h = int(crop_w / card_aspect)
            if crop_h > orig_h:
                crop_h = int(orig_h * 0.88)
                crop_w = int(crop_h * card_aspect)

        x1 = max(0, (orig_w - crop_w) // 2)
        y1 = max(0, (orig_h - crop_h) // 2)
        warped = image[y1 : y1 + crop_h, x1 : x1 + crop_w]

    enhanced = enhance_card_image(warped)

    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 92]
    success, encoded_img = cv2.imencode(".jpg", enhanced, encode_params)
    if not success:
        raise RuntimeError("Failed to encode processed card image to JPEG")

    b64_str = base64.b64encode(encoded_img).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{b64_str}"

    return {
        "success": True,
        "detected": detected,
        "width": int(enhanced.shape[1]),
        "height": int(enhanced.shape[0]),
        "image": data_url,
    }
