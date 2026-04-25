"""
Сообщения между пользователями.
GET  ?action=chats       — список чатов (собеседников) текущего юзера
GET  ?action=history&with_user_id=X — история переписки с пользователем X
POST ?action=send        — отправить сообщение {to_user_id, text}
GET  ?action=users       — список всех пользователей (для поиска)
POST ?action=mark_read&with_user_id=X — пометить сообщения прочитанными
"""
import json
import os
import psycopg2

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

    user_id, username = user

    if action == "chats":
        return get_chats(conn, cur, user_id)
    elif action == "history":
        with_id = params.get("with_user_id")
        return get_history(conn, cur, user_id, with_id)
    elif action == "send" and method == "POST":
        body = json.loads(event.get("body") or "{}")
        return send_message(conn, cur, user_id, body)
    elif action == "users":
        return get_users(conn, cur, user_id)
    elif action == "mark_read" and method == "POST":
        with_id = params.get("with_user_id")
        return mark_read(conn, cur, user_id, with_id)

    conn.close()
    return err(404, "Not found")


def get_chats(conn, cur, user_id):
    cur.execute(f"""
        SELECT
            u.id,
            u.username,
            u.last_seen,
            m.text AS last_msg,
            m.created_at AS last_time,
            m.from_user_id AS last_from,
            COUNT(unread.id) AS unread_count
        FROM {SCHEMA}.users u
        JOIN (
            SELECT DISTINCT
                CASE WHEN from_user_id = %s THEN to_user_id ELSE from_user_id END AS partner_id
            FROM {SCHEMA}.messages
            WHERE from_user_id = %s OR to_user_id = %s
        ) partners ON u.id = partners.partner_id
        LEFT JOIN LATERAL (
            SELECT text, created_at, from_user_id
            FROM {SCHEMA}.messages
            WHERE (from_user_id = %s AND to_user_id = u.id)
               OR (from_user_id = u.id AND to_user_id = %s)
            ORDER BY created_at DESC
            LIMIT 1
        ) m ON true
        LEFT JOIN {SCHEMA}.messages unread
            ON unread.from_user_id = u.id
            AND unread.to_user_id = %s
            AND unread.is_read = FALSE
        GROUP BY u.id, u.username, u.last_seen, m.text, m.created_at, m.from_user_id
        ORDER BY m.created_at DESC NULLS LAST
    """, (user_id, user_id, user_id, user_id, user_id, user_id))

    rows = cur.fetchall()
    conn.close()

    chats = []
    for row in rows:
        chats.append({
            "id": row[0],
            "username": row[1],
            "last_seen": str(row[2]) if row[2] else None,
            "last_msg": row[3] or "",
            "last_time": str(row[4]) if row[4] else None,
            "last_from_me": row[5] == user_id,
            "unread_count": row[6],
        })
    return ok({"chats": chats})


def get_history(conn, cur, user_id, with_user_id):
    if not with_user_id:
        conn.close()
        return err(400, "with_user_id required")

    try:
        wid = int(with_user_id)
    except Exception:
        conn.close()
        return err(400, "invalid with_user_id")

    cur.execute(f"""
        SELECT id, from_user_id, to_user_id, text, created_at, is_read, media_url, media_type
        FROM {SCHEMA}.messages
        WHERE (from_user_id = %s AND to_user_id = %s)
           OR (from_user_id = %s AND to_user_id = %s)
        ORDER BY created_at ASC
        LIMIT 200
    """, (user_id, wid, wid, user_id))

    rows = cur.fetchall()

    cur.execute(
        f"SELECT id, username, last_seen FROM {SCHEMA}.users WHERE id = %s",
        (wid,)
    )
    partner = cur.fetchone()
    conn.close()

    if not partner:
        return err(404, "Пользователь не найден")

    msgs = []
    for row in rows:
        msgs.append({
            "id": row[0],
            "from_me": row[1] == user_id,
            "text": row[3],
            "time": str(row[4]),
            "is_read": row[5],
            "media_url": row[6],
            "media_type": row[7],
        })

    return ok({
        "messages": msgs,
        "partner": {"id": partner[0], "username": partner[1], "last_seen": str(partner[2])}
    })


def send_message(conn, cur, user_id, body):
    to_id = body.get("to_user_id")
    text = (body.get("text") or "").strip()
    media_url = body.get("media_url") or None
    media_type = body.get("media_type") or None

    if not to_id or (not text and not media_url):
        conn.close()
        return err(400, "to_user_id и text или media_url обязательны")
    if text and len(text) > 4000:
        conn.close()
        return err(400, "Сообщение слишком длинное")

    try:
        to_id = int(to_id)
    except Exception:
        conn.close()
        return err(400, "invalid to_user_id")

    if to_id == user_id:
        conn.close()
        return err(400, "Нельзя писать самому себе")

    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s", (to_id,))
    if not cur.fetchone():
        conn.close()
        return err(404, "Получатель не найден")

    cur.execute(
        f"INSERT INTO {SCHEMA}.messages (from_user_id, to_user_id, text, media_url, media_type) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
        (user_id, to_id, text or None, media_url, media_type)
    )
    msg_id, created_at = cur.fetchone()
    conn.commit()
    conn.close()

    return ok({"id": msg_id, "time": str(created_at), "text": text, "media_url": media_url, "media_type": media_type})


def get_users(conn, cur, user_id):
    cur.execute(
        f"SELECT id, username, last_seen FROM {SCHEMA}.users WHERE id != %s ORDER BY username",
        (user_id,)
    )
    rows = cur.fetchall()
    conn.close()
    users = [{"id": r[0], "username": r[1], "last_seen": str(r[2])} for r in rows]
    return ok({"users": users})


def mark_read(conn, cur, user_id, with_user_id):
    if not with_user_id:
        conn.close()
        return err(400, "with_user_id required")
    try:
        wid = int(with_user_id)
    except Exception:
        conn.close()
        return err(400, "invalid with_user_id")

    cur.execute(
        f"UPDATE {SCHEMA}.messages SET is_read = TRUE WHERE from_user_id = %s AND to_user_id = %s AND is_read = FALSE",
        (wid, user_id)
    )
    conn.commit()
    conn.close()
    return ok({"ok": True})