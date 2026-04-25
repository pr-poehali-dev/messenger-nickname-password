"""
WebRTC сигналинг и загрузка медиафайлов.
POST ?action=send_signal   — отправить SDP/ICE сигнал {to_user_id, type, payload}
GET  ?action=poll_signals  — получить входящие сигналы (и пометить consumed)
POST ?action=upload_media  — загрузить фото/видео (base64 в body), вернуть URL
"""
import json, os, base64, uuid, mimetypes
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p34636560_messenger_nickname_p")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def get_user(cur, token):
    cur.execute(
        f"""SELECT u.id, u.username FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = event.get("headers") or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token") or ""
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    method = event.get("httpMethod", "GET")

    conn = get_conn()
    cur = conn.cursor()
    user = get_user(cur, token)
    if not user:
        conn.close()
        return err(401, "Не авторизован")
    user_id = user[0]

    if action == "send_signal" and method == "POST":
        return send_signal(conn, cur, user_id, event)
    elif action == "poll_signals":
        return poll_signals(conn, cur, user_id)
    elif action == "upload_media" and method == "POST":
        return upload_media(conn, cur, user_id, event)

    conn.close()
    return err(404, "Not found")


def send_signal(conn, cur, user_id, event):
    body = json.loads(event.get("body") or "{}")
    to_id = body.get("to_user_id")
    sig_type = body.get("type", "")
    payload = body.get("payload", "")

    if not to_id or not sig_type or not payload:
        conn.close()
        return err(400, "Обязательные поля: to_user_id, type, payload")

    cur.execute(
        f"INSERT INTO {SCHEMA}.signaling (from_user_id, to_user_id, type, payload) VALUES (%s, %s, %s, %s) RETURNING id",
        (user_id, int(to_id), sig_type, json.dumps(payload) if not isinstance(payload, str) else payload)
    )
    sig_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return ok({"id": sig_id})


def poll_signals(conn, cur, user_id):
    cur.execute(
        f"""SELECT id, from_user_id, type, payload, created_at
            FROM {SCHEMA}.signaling
            WHERE to_user_id = %s AND consumed = FALSE
            ORDER BY created_at ASC LIMIT 50""",
        (user_id,)
    )
    rows = cur.fetchall()

    if rows:
        ids = [r[0] for r in rows]
        cur.execute(f"UPDATE {SCHEMA}.signaling SET consumed = TRUE WHERE id = ANY(%s)", (ids,))
        conn.commit()

    conn.close()
    signals = []
    for r in rows:
        try:
            payload = json.loads(r[3])
        except Exception:
            payload = r[3]
        signals.append({"id": r[0], "from_user_id": r[1], "type": r[2], "payload": payload, "time": str(r[4])})

    return ok({"signals": signals})


def upload_media(conn, cur, user_id, event):
    conn.close()
    body = json.loads(event.get("body") or "{}")
    data_b64 = body.get("data", "")
    mime = body.get("mime", "image/jpeg")

    if not data_b64:
        return err(400, "Нет данных файла")

    # max ~10MB base64
    if len(data_b64) > 14_000_000:
        return err(400, "Файл слишком большой (максимум 10 МБ)")

    try:
        file_bytes = base64.b64decode(data_b64)
    except Exception:
        return err(400, "Неверный формат base64")

    ext = mimetypes.guess_extension(mime) or ".bin"
    if ext == ".jpe":
        ext = ".jpg"
    key = f"media/{user_id}/{uuid.uuid4().hex}{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return ok({"url": url, "mime": mime})
