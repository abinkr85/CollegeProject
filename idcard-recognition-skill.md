---
name: idcard-recognition
description: Integrate server-side ID document recognition (ID card, passport, driver's licence; OCR + MRZ + barcode) into any project by running a Dockerised Python microservice built on the KBY-AI ID Card SDK and calling it over HTTP. Use when the user asks to add ID/KYC document scanning, extract fields from an ID image, parse a passport MRZ, or reproduce the "IDCardRecognition-Docker" architecture in another app. Covers licensing, Docker setup, the REST contract, a hardened service template, frontend/backend client code, privacy rules and testing.
---

# ID Card Recognition Skill

## 0. Read this first: what the source project actually is

The reference project (`IDCardRecognition-Docker`) is a **thin Python wrapper around a proprietary, closed-source native library** from KBY-AI. There is no OCR, detection or MRZ code in the repo itself.

| Piece | What it is | In the repo? |
|---|---|---|
| `libkbyai_idsdk.so` | The real engine (document detection, OCR, MRZ, barcode, 200+ countries) | **No.** Obtained from the vendor / Docker image |
| `data/` | Model files for the SDK | **No.** Downloaded separately (the README links a Google Drive zip) |
| `libimutils.so`, `libimutils.so_for_ubuntu22` | Native image-utility dependency of the SDK | Yes |
| `idsdk.py` | `ctypes` bindings to the SDK | Yes |
| `app.py` | Flask REST API around the bindings | Yes |
| `gradio/demo.py` | Demo web UI that calls the REST API | Yes |
| `license.txt` | Per-machine licence key | Yes (a sample; **never copy it into other projects or this skill**) |

Consequences the agent must respect:

1. **The recognition logic cannot be re-implemented from this code.** Integration means *running the SDK container and calling it*.
2. **The SDK needs a licence bound to the machine code** of each host. Without one, `setActivation` fails and recognition does not work. Licences come from the vendor (contact@kby-ai.com). Do not invent or reuse keys.
3. **Do not fabricate response field names.** The JSON keys depend on the document type and country; see section 4.
4. If the user cannot or will not use a commercial SDK, offer the open-source fallback in section 10 and be explicit about its lower accuracy and coverage.

## 1. When to use this skill

Use it when a project needs to:
- Extract text fields (name, number, DOB, expiry, address) from an ID image
- Read a passport/ID MRZ or a driver's licence barcode (PDF417)
- Support front + back capture of one document
- Run recognition on the project's own server for privacy or compliance, instead of calling a third-party cloud API

Do not use it for: face matching, liveness detection (separate KBY-AI product), or document forgery detection beyond what the SDK returns.

## 2. Architecture

```
Client (web / mobile / backend job)
   | multipart file(s)  or  JSON base64
   v
[ HTTP API layer: Flask ]        <- app.py
   | base64 string (bytes)
   v
[ ctypes binding ]               <- idsdk.py  (loads libkbyai_idsdk.so)
   v
[ KBY-AI native SDK + data/ models, activated by licence ]
   | JSON string (or NULL on failure)
   v
[ API layer adds "Status": "Ok" ] -> JSON response
```

SDK lifecycle (must happen **once at process start**, in this order):

1. `getMachineCode()` returns bytes. Print/log it, send it to the vendor to get a licence.
2. `setActivation(licence_bytes)` returns an int (success = `SDK_SUCCESS`; any other value is an error code).
3. `initSDK()` returns an int (same convention).
4. Then `idcardRecognition(front_b64_bytes, back_b64_bytes)` per request.

Licence loading order in the source: environment variable `LICENSE` first, otherwise the file `license.txt` next to `app.py`.

## 3. Native binding (`idsdk.py`), reproduce exactly

```python
import os
from ctypes import cdll, c_char_p, c_int32

libPath = os.path.abspath(os.path.dirname(__file__)) + '/libkbyai_idsdk.so'
idsdk = cdll.LoadLibrary(libPath)

getMachineCode = idsdk.getMachineCode
getMachineCode.argtypes = []
getMachineCode.restype = c_char_p

setActivation = idsdk.setActivation
setActivation.argtypes = [c_char_p]
setActivation.restype = c_int32

initSDK = idsdk.initSDK
initSDK.argtypes = []
initSDK.restype = c_int32

idcardRecognition = idsdk.idcardRecognition
idcardRecognition.argtypes = [c_char_p, c_char_p]   # (front_b64, back_b64)
idcardRecognition.restype = c_char_p                # JSON string or None
```

Rules:
- Both arguments are **UTF-8 bytes of a base64 string** (not raw image bytes, not a data-URI prefix).
- Pass `b""` as the second argument when there is no back image.
- Return value `None` means recognition failed; otherwise `json.loads(ret)`.
- The `.so` is x86-64 Linux only. It will not load on macOS, Windows or ARM without emulation.

## 4. REST contract exposed by the service

| Method + path | Body | Notes |
|---|---|---|
| `POST /idcard_recognition` | multipart, field `file` | Single image |
| `POST /idcard_recognition_multi_page` | multipart, `file1` (front, required), `file2` (back, optional) | Front + back |
| `POST /idcard_recognition_base64` | JSON `{"base64": "..."}` | Single image |
| `POST /idcard_recognition_base64_multi_page` | JSON `{"base64_1": "...", "base64_2": "..."}` | `base64_2` optional |

Default port inside the container: `8080` (override with env `PORT`). Demo UI: `9000`. Typical host mapping: `-p 8082:8080 -p 9002:9000`.

Response (the source always returns HTTP 200 and signals errors in the body):

```json
{ "Status": "Ok", "<Field>": "<value>", "...": "...",
  "MRZ": { "...": "..." },       // present when an MRZ was read
  "Barcode": { "...": "..." },   // present when a barcode was read
  "Position": { "...": "..." },  // geometry, ignore for display
  "Images": { "<name>": "<base64 PNG>" } }  // cropped face / signature / document images
```

`Status` values seen in the source: `Ok`, `Processing Failed` (SDK returned NULL), `Image Error` (bad/missing input), `Front Image Error`.

**Field names are dynamic.** Everything except `Status`, `Images`, `MRZ`, `Position`, `Barcode` is an OCR field whose key varies by document. `MRZ` and `Barcode` objects reuse the same key names as the OCR fields so values can be compared across sources (the demo does exactly this: one row per key with OCR / MRZ / Barcode columns). Before writing a typed schema, run 2-3 real sample images and **record the actual keys**, then map them.

## 5. Project layout to create

```
idcard-service/
  Dockerfile
  run.sh
  requirements.txt
  app.py
  idsdk.py
  libkbyai_idsdk.so          # supplied by vendor, not in git history of other repos
  libimutils.so_for_ubuntu22 # supplied with the SDK
  data/                      # SDK models, supplied by vendor (git-ignored)
  license.txt                # git-ignored; or use LICENSE env var
  .gitignore                 # data/, license.txt, *.so
  gradio/demo.py             # optional demo
```

`requirements.txt` (source): `flask`, `flask-cors`, `gradio==3.50.2`, `datadog_api_client`.
Note: `datadog_api_client` is imported by the demo but unused. Gradio is demo-only and can be dropped from production images. Pin versions when productionising.

## 6. Docker (source behaviour + known pitfalls)

Source `Dockerfile`:

```dockerfile
FROM python:3.8-slim
RUN apt-get update -y
RUN apt-get install -y libpcsclite-dev psmisc libcurl4-openssl-dev libssl-dev
RUN mkdir -p /root/kby-ai-idcard
WORKDIR /root/kby-ai-idcard
COPY ./libkbyai_idsdk.so .
COPY ./libimutils.so_for_ubuntu22 /usr/lib/libimutils.so
COPY ./idsdk.py .
COPY ./app.py .
COPY ./demo.py .
COPY ./requirements.txt .
COPY ./run.sh .
COPY ./idcard_examples ./idcard_examples
COPY ./data ./data
RUN pip3 install -r requirements.txt
CMD ["./run.sh"]
EXPOSE 8080 9000
```

`run.sh` starts the demo in the background and the API in the foreground:

```bash
#!/bin/bash
cd /root/kby-ai-idcard
exec python3 demo.py &
exec python3 app.py
```

Pitfalls the agent must handle when adapting:
- The Dockerfile copies `./demo.py` and `./idcard_examples` from the build root, but in the repo they live under `gradio/`. Either move them or fix the `COPY` paths, or drop the demo.
- `libkbyai_idsdk.so` and `data/` are **not in the repo**; the build fails until they are placed in the build context.
- `libimutils.so` vs `libimutils.so_for_ubuntu22`: the Dockerfile uses the Ubuntu 22 variant. Pick the one matching the base image's glibc.
- `python:3.8-slim` is end-of-life. Test the SDK on a newer Python (3.10/3.11) before changing; if the `.so` was built against 3.8-era libs, keep 3.8 and isolate the container.
- Combine `apt-get update` and `install` in one `RUN`, add `--no-install-recommends`, and clean apt lists.
- `exec ... &` in `run.sh` is misleading; the first `exec` backgrounds a subshell. Prefer a plain `python3 demo.py &` then `exec python3 app.py`.
- Flask's built-in server (`app.run`) is a dev server. For production use `gunicorn` with workers sized to RAM (the SDK recommends 2 CPU cores, 4-8 GB RAM, 4-8 GB disk, Ubuntu 20.04+). **Verify the SDK is safe to call from multiple threads/processes before raising worker counts**; each process must run the activation sequence.

Build and run:

```bash
docker build --pull --rm -t idcard-service:latest .
# licence via env var (preferred) ...
docker run -e LICENSE="$LICENSE" -p 8082:8080 -p 9002:9000 idcard-service:latest
# ... or via mounted file
docker run -v ./license.txt:/root/kby-ai-idcard/license.txt -p 8082:8080 idcard-service:latest
```

Licensing workflow: run once without a valid licence, read `machineCode` from the container logs, send it to the vendor, receive the key, supply it via `LICENSE` or `license.txt`, restart. The licence is **tied to the machine code**, so a new host or container environment may need a new licence. Confirm this with the vendor before scaling horizontally.

## 7. Hardened service template (use instead of copying the source verbatim)

The source works but has defects: bare `except:` blocks, HTTP 200 for every error, the licence printed to logs, no size or type limits, four near-duplicate handlers, and no health check. This template keeps the same contract and fixes those.

```python
import os, json, base64, logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from idsdk import getMachineCode, setActivation, initSDK, idcardRecognition

log = logging.getLogger("idcard")
logging.basicConfig(level=logging.INFO)

MAX_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", 8 * 1024 * 1024))
ALLOWED = {"image/jpeg", "image/png", "image/webp"}

def load_license() -> str:
    lic = os.environ.get("LICENSE")
    if lic:
        return lic.strip()
    try:
        with open("license.txt") as f:
            return f.read().strip()
    except OSError:
        return ""

# ---- SDK startup (once per process) ----
log.info("machineCode: %s", getMachineCode().decode())
act = setActivation(load_license().encode())
init = initSDK()
log.info("activation=%s init=%s", act, init)   # never log the licence itself
SDK_READY = (act == 0 and init == 0)           # confirm SDK_SUCCESS == 0 with the vendor docs

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * MAX_BYTES + 1024 * 1024
CORS(app, origins=os.environ.get("CORS_ORIGINS", "").split(",") or None)

def err(status_text, code):
    return jsonify({"Status": status_text}), code

def b64_from_upload(f):
    data = f.read()
    if not data or len(data) > MAX_BYTES or f.mimetype not in ALLOWED:
        raise ValueError("bad image")
    return base64.b64encode(data)              # bytes

def b64_from_json(s):
    s = s.split(",", 1)[-1]                    # tolerate data: URI prefix
    base64.b64decode(s, validate=True)         # raises on invalid base64
    if len(s) > MAX_BYTES * 4 // 3:
        raise ValueError("too large")
    return s.encode()

def run(front: bytes, back: bytes = b""):
    if not SDK_READY:
        return err("SDK Not Activated", 503)
    try:
        ret = idcardRecognition(front, back)
    except Exception:
        log.exception("sdk call failed")
        return err("Processing Failed", 500)
    if ret is None:
        return err("Processing Failed", 422)
    out = json.loads(ret)
    out["Status"] = "Ok"
    return jsonify(out), 200

@app.get("/health")
def health():
    return jsonify({"ready": SDK_READY}), (200 if SDK_READY else 503)

@app.post("/idcard_recognition")
def single():
    try:
        return run(b64_from_upload(request.files["file"]))
    except (KeyError, ValueError):
        return err("Image Error", 400)

@app.post("/idcard_recognition_multi_page")
def multi():
    try:
        front = b64_from_upload(request.files["file1"])
    except (KeyError, ValueError):
        return err("Front Image Error", 400)
    back = b""
    if "file2" in request.files:
        try:
            back = b64_from_upload(request.files["file2"])
        except ValueError:
            return err("Back Image Error", 400)
    return run(front, back)

@app.post("/idcard_recognition_base64")
def single_b64():
    try:
        return run(b64_from_json(request.get_json(force=True)["base64"]))
    except (KeyError, TypeError, ValueError):
        return err("Image Error", 400)

@app.post("/idcard_recognition_base64_multi_page")
def multi_b64():
    j = request.get_json(silent=True) or {}
    try:
        front = b64_from_json(j["base64_1"])
    except (KeyError, TypeError, ValueError):
        return err("Front Image Error", 400)
    back = b""
    if j.get("base64_2"):
        try:
            back = b64_from_json(j["base64_2"])
        except (TypeError, ValueError):
            return err("Back Image Error", 400)
    return run(front, back)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

If the host project requires the original always-200 behaviour (for example an existing client that only reads `Status`), keep the status-in-body convention but still add the validation, the logging fix and `/health`.

## 8. Client integration patterns

**Backend-to-service (Node/Express, preferred: browser never talks to the SDK container directly)**

```js
// Node 18+; npm i multer
import express from "express";
import multer from "multer";

const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });
const ID_URL = process.env.IDCARD_URL; // e.g. http://idcard:8080

app.post("/api/kyc/id", upload.fields([{ name: "front", maxCount: 1 }, { name: "back", maxCount: 1 }]),
  async (req, res) => {
    const form = new FormData();
    const f = req.files?.front?.[0];
    if (!f) return res.status(400).json({ error: "front image required" });
    form.append("file1", new Blob([f.buffer], { type: f.mimetype }), f.originalname);
    const b = req.files?.back?.[0];
    if (b) form.append("file2", new Blob([b.buffer], { type: b.mimetype }), b.originalname);

    const r = await fetch(`${ID_URL}/idcard_recognition_multi_page`, { method: "POST", body: form });
    const data = await r.json();
    if (data.Status !== "Ok") return res.status(422).json({ error: data.Status });
    const { Images, Position, ...fields } = data;       // do not forward raw crops unless needed
    res.json(fields);
  });
```

**Python caller (same as the Gradio demo)**

```python
import requests
r = requests.post("http://127.0.0.1:8082/idcard_recognition_multi_page",
                  files={"file1": open("front.jpg", "rb"), "file2": open("back.jpg", "rb")}, timeout=60)
data = r.json()
assert data["Status"] == "Ok", data["Status"]
```

**React upload form (calls your own backend, never the SDK host)**

```jsx
async function submit(front, back) {
  const fd = new FormData();
  fd.append("front", front);
  if (back) fd.append("back", back);
  const res = await fetch("/api/kyc/id", { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // show fields for the user to review and correct
}
```

Always show extracted values to the user for confirmation before saving; OCR can be wrong.

## 9. Data handling and privacy rules (mandatory)

ID documents are highly sensitive personal data.

1. **Do not persist the uploaded image** unless there is a stated legal need. Process in memory and discard.
2. Never log request bodies, base64 payloads, extracted fields, MRZ strings, or the licence key. Log only request id, status, latency.
3. TLS everywhere; place the SDK container on a private network, reachable only from your backend. Do not expose the demo port (9000) publicly.
4. Authenticate and rate-limit the endpoint in your backend. The SDK service itself has no auth.
5. If storing extracted data, encrypt at rest, store the minimum fields, and define a retention period. Check the applicable law (GDPR, India DPDP Act, CCPA, etc.) and tell the user to confirm with legal counsel.
6. Strip `Images` crops from responses unless the feature needs them.
7. Treat user-uploaded files as untrusted: enforce size and MIME limits (see template).
8. Never commit `license.txt`, `data/`, `.so` files or real ID images. The sample `.gitignore` only ignores `/data`; extend it.
9. For tests and demos use synthetic or sample images only, and blur real ones.

## 10. Fallback when the commercial SDK is not an option

Only if the user explicitly cannot use the KBY-AI SDK. This is **not** part of the source project and has lower accuracy and country coverage:

- Detection and cropping: OpenCV (contours / perspective transform).
- OCR: Tesseract (`pytesseract`) or PaddleOCR / EasyOCR.
- MRZ: `PassportEye` or a custom parser with ICAO 9303 check-digit validation.
- Barcode (PDF417/QR): `pyzxing` / `zxing-cpp` or `pyzbar`.
- Country-specific field extraction (for example Aadhaar or PAN in India) needs per-template regex/position rules and checksum validation (Aadhaar uses the Verhoeff checksum). Build a per-document-type parser and test against many real samples.

Keep the same HTTP contract (section 4) so the rest of the project does not change when the engine is swapped.

## 11. Implementation checklist for the agent

1. Confirm the user has (or will obtain) the vendor SDK files, `data/`, and a licence. If not, stop and say so; do not fake it.
2. Confirm hosting: x86-64 Linux with at least 2 cores and 4 GB RAM.
3. Create the layout (section 5); add `.gitignore` entries for secrets and models.
4. Fix the Dockerfile `COPY` paths; build; run; read the machine code from logs; get the licence; restart.
5. Hit `/health`, then call each endpoint with a sample image (use the Postman collection pattern: form-data key `file`, `file1`/`file2`, or JSON `base64`, `base64_1`, `base64_2`).
6. Save 2-3 real responses and derive the field-name mapping for the project's document types.
7. Add the backend proxy, auth, rate limit, and the frontend upload and review screen.
8. Apply section 9. Add tests.

## 12. Testing checklist

- [ ] Valid front image returns `Status: "Ok"` with fields
- [ ] Front + back returns merged fields; back-only barcodes/MRZ appear under `Barcode` / `MRZ`
- [ ] Passport shows `MRZ` populated; compare MRZ vs OCR values
- [ ] Blurry, rotated, dark and glare images fail gracefully (`Processing Failed`, not a 500 crash)
- [ ] Non-image upload, empty file, oversized file, invalid base64 are rejected with 400
- [ ] Missing `file` / `file1` field returns the correct `... Image Error`
- [ ] Container started with no or invalid licence reports `/health` 503 and logs the machine code but not the key
- [ ] Logs contain no PII or licence
- [ ] Concurrent requests (10-20) do not crash the SDK; measure latency per image
- [ ] Image uploaded by the user is not written to disk or left in temp files

## 13. Known limitations of the source (tell the user)

- Closed-source engine; accuracy and supported documents depend entirely on the vendor ("200+ countries", "130+ languages" per the README, not verified here).
- Licence is per machine; scaling or migrating hosts needs vendor involvement.
- Source returns HTTP 200 for failures, swallows exceptions, prints the licence to stdout, has no size limits or auth, and uses an EOL Python base image. Use the hardened template.
- The README's example IP address and Postman paths are the vendor's demo server; never send real ID images to it.
