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


def is_valid_card_polygon(approx: np.ndarray, frame_area: float) -> tuple[bool, float]:
    """
    Validates that a contour strictly satisfies ID card geometry:
    1. Strictly 4 corners and convex.
    2. Contour area occupies a minimum area threshold (>= 15% of frame) and <= 95%.
    3. Bounding box aspect ratio matches ID card dimensions (~1.586 ratio,
       tolerant to perspective tilts between 1.20 and 2.10).
    4. Opposite edges are balanced to eliminate degenerate shapes.
    """
    if len(approx) != 4 or not cv2.isContourConvex(approx):
        return False, 0.0

    area = cv2.contourArea(approx)
    min_area = 0.15 * frame_area
    max_area = 0.95 * frame_area
    if area < min_area or area > max_area:
        return False, 0.0

    rect = cv2.minAreaRect(approx)
    box_w, box_h = rect[1]
    if box_w <= 10 or box_h <= 10:
        return False, 0.0

    long_side = max(box_w, box_h)
    short_side = min(box_w, box_h)
    aspect_ratio = long_side / short_side

    # CR80 standard card ratio is 85.6mm / 53.98mm ~= 1.586
    if aspect_ratio < 1.20 or aspect_ratio > 2.10:
        return False, aspect_ratio

    # Rectangular fill ratio: valid ID card polygon closely matches its minimum area bounding box
    rect_area = box_w * box_h
    if rect_area > 0:
        fill_ratio = area / rect_area
        if fill_ratio < 0.68 or fill_ratio > 1.05:
            return False, aspect_ratio

    pts = approx.reshape(4, 2)
    d01 = np.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1])
    d12 = np.hypot(pts[1][0] - pts[2][0], pts[1][1] - pts[2][1])
    d23 = np.hypot(pts[2][0] - pts[3][0], pts[2][1] - pts[3][1])
    d30 = np.hypot(pts[3][0] - pts[0][0], pts[3][1] - pts[0][1])

    if min(d01, d12, d23, d30) < 25:
        return False, aspect_ratio

    ratio_opp_1 = max(d01, d23) / max(min(d01, d23), 1.0)
    ratio_opp_2 = max(d12, d30) / max(min(d12, d30), 1.0)
    if ratio_opp_1 > 1.65 or ratio_opp_2 > 1.65:
        return False, aspect_ratio

    # Internal corner angles: each vertex of a rectangular ID card must be close to orthogonal (roughly 90 deg)
    # cos(theta) > 0.62 means the angle is sharper than 51 deg or wider than 129 deg
    ordered = order_points(pts.astype("float32"))
    for i in range(4):
        p_prev = ordered[i - 1]
        p_curr = ordered[i]
        p_next = ordered[(i + 1) % 4]
        v1 = p_prev - p_curr
        v2 = p_next - p_curr
        norm1 = float(np.linalg.norm(v1))
        norm2 = float(np.linalg.norm(v2))
        if norm1 > 0 and norm2 > 0:
            cos_theta = abs(float(np.dot(v1, v2)) / (norm1 * norm2))
            if cos_theta > 0.62:
                return False, aspect_ratio

    # Diagonal symmetry: opposite corners in an ID card form diagonals of nearly equal length (even under tilt)
    # Sheared rhombuses or folded fabric stripes have unequal diagonals (ratio > 1.32)
    diag1 = np.hypot(ordered[0][0] - ordered[2][0], ordered[0][1] - ordered[2][1])
    diag2 = np.hypot(ordered[1][0] - ordered[3][0], ordered[1][1] - ordered[3][1])
    diag_ratio = max(diag1, diag2) / max(min(diag1, diag2), 1.0)
    if diag_ratio > 1.32:
        return False, aspect_ratio

    return True, aspect_ratio


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

    # Pass 1: Canny edge detection + morphology
    edged = cv2.Canny(blurred, 35, 120)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    frame_area = resized.shape[0] * resized.shape[1]
    card_contour = None
    detected_aspect_ratio = None

    for c in contours[:15]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.025 * peri, True)
        is_valid, ar = is_valid_card_polygon(approx, frame_area)
        if is_valid:
            card_contour = approx
            detected_aspect_ratio = ar
            break

    # Pass 2: Otsu thresholding fallback if Canny pass did not find a card
    if card_contour is None:
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        thresh_closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
        thresh_contours, _ = cv2.findContours(thresh_closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        thresh_contours = sorted(thresh_contours, key=cv2.contourArea, reverse=True)
        for c in thresh_contours[:15]:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.025 * peri, True)
            is_valid, ar = is_valid_card_polygon(approx, frame_area)
            if is_valid:
                card_contour = approx
                detected_aspect_ratio = ar
                break

    detected = False
    if card_contour is not None:
        pts = card_contour.reshape(4, 2) / scale
        warped = four_point_transform(image, pts, orientation=orientation)
        detected = True
    else:
        # Fallback: Center crop matching the card aspect ratio (only used if user forces manual shutter)
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
