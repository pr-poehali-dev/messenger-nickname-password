"""
Авторизация: регистрация, вход, проверка сессии.
POST ?action=register — создать аккаунт (username + password)
POST ?action=login    — войти (username + password) → token
GET  ?action=me       — получить данные по токену
"""
import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p34636560_messenger_nickname_p")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def ok(data: dict) -> dict:
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}

def err(code: int, msg: str) -> dict:
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    method = event.get("httpMethod", "GET")

    if action == "register" and method == "POST":
        return register(event)
    elif action == "login" and method == "POST":
        return login(event)
    elif action == "me":
        return me(event)

    return err(404, "Not found")


def register(event: dict) -> dict:
    body = json.loads(event.get("body") or "{}")
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return err(400, "Заполните все поля")
    if len(username) < 3:
        return err(400, "Ник минимум 3 символа")
    if len(password) < 4:
        return err(400, "Пароль минимум 4 символа")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (username,))
    if cur.fetchone():
        conn.close()
        return err(409, "Ник уже занят")

    pw_hash = hash_password(password)
    cur.execute(
        f"INSERT INTO {SCHEMA}.users (username, password_hash) VALUES (%s, %s) RETURNING id",
        (username, pw_hash)
    )
    user_id = cur.fetchone()[0]

    token = secrets.token_hex(32)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
        (user_id, token)
    )
    conn.commit()
    conn.close()

    return ok({"token": token, "username": username, "id": user_id})


def login(event: dict) -> dict:
    body = json.loads(event.get("body") or "{}")
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return err(400, "Заполните все поля")

    conn = get_conn()
    cur = conn.cursor()

    pw_hash = hash_password(password)
    cur.execute(
        f"SELECT id, username FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s",
        (username, pw_hash)
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return err(401, "Неверный ник или пароль")

    user_id, uname = row
    cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = %s", (user_id,))

    token = secrets.token_hex(32)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
        (user_id, token)
    )
    conn.commit()
    conn.close()

    return ok({"token": token, "username": uname, "id": user_id})


def me(event: dict) -> dict:
    headers = event.get("headers") or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token") or ""

    if not token:
        return err(401, "Не авторизован")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT u.id, u.username FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return err(401, "Сессия истекла")

    return ok({"id": row[0], "username": row[1]})
