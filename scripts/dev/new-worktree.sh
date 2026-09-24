#!/usr/bin/env bash
#
# new-worktree.sh — tạo git worktree cách ly cho một task (DRIFT-TASKS T00).
#
# Nguyên tắc an toàn (DRIFT-TASKS §1.2):
#   - Worktree dùng .env.worktree (giá trị local/staging), KHÔNG dùng .env prod.
#   - Từ chối tạo worktree nếu VITE_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_URL
#     trỏ tới project prod (mặc định ref vcxarjwzbihvurpkcufa).
#   - Từ chối nếu SUPABASE_SECRET_KEY hoặc SUPABASE_SERVICE_ROLE_KEY được set
#     non-empty: worktree không bao giờ được giữ secret server.
#
# Dùng:  scripts/dev/new-worktree.sh <ID>
# Ví dụ: scripts/dev/new-worktree.sh T00-smoke
#
# Kết quả: ../vcube-<ID> trên nhánh mới task/<ID>, .env được copy từ .env.worktree, deps đã cài.
# Thoát != 0 nếu: thiếu/sai tham số, thiếu .env.worktree, URL chứa prod ref, secret server
# được set, nhánh/đường dẫn đã tồn tại, hoặc không tìm thấy lockfile.

set -euo pipefail

usage() {
  echo "Dùng: $0 <ID>" >&2
  echo "Ví dụ: $0 T00-smoke" >&2
}

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  usage
  exit 2
fi

ID="$1"

case "$ID" in
  *[!A-Za-z0-9._-]* | '')
    echo "LỖI: ID không hợp lệ (chỉ cho phép A-Za-z0-9._-): '$ID'" >&2
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Repo gốc (worktree chính) dù script chạy từ đâu.
GIT_COMMON_DIR="$(git -C "$SCRIPT_DIR" rev-parse --path-format=absolute --git-common-dir)"
MAIN_ROOT="$(dirname "$GIT_COMMON_DIR")"

WORKTREE_PATH="$(dirname "$MAIN_ROOT")/vcube-$ID"
BRANCH="task/$ID"
ENV_WORKTREE="$MAIN_ROOT/.env.worktree"
PROD_REF="${VCUBE_PROD_REF:-vcxarjwzbihvurpkcufa}"

if [ ! -f "$ENV_WORKTREE" ]; then
  echo "LỖI: thiếu $ENV_WORKTREE" >&2
  echo "      Tạo nó từ .env.worktree.example (local/staging; KHÔNG dùng khoá prod)." >&2
  exit 1
fi

if [ -z "$(git -C "$MAIN_ROOT" check-ignore -- .env.worktree 2>/dev/null || true)" ]; then
  echo "CẢNH BÁO: .env.worktree chưa được .gitignore bỏ qua — tuyệt đối không commit nó." >&2
fi

# Giá trị hiệu lực (dòng cuối) của một biến trong .env.worktree; rỗng nếu không có.
# Chấp nhận tiền tố `export `, khoảng trắng hai đầu và nháy đơn/kép bao quanh.
env_value() {
  local var="$1" line val
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${var}=" "$ENV_WORKTREE" | tail -n 1 || true)"
  [ -z "$line" ] && return 0
  val="${line#*=}"
  val="$(printf '%s' "$val" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  case "$val" in
    \"*\") val="${val%\"}"; val="${val#\"}" ;;
    \'*\') val="${val%\'}"; val="${val#\'}" ;;
  esac
  printf '%s' "$val"
}

# Bắt buộc có URL client (dòng có hiệu lực).
if [ -z "$(env_value VITE_SUPABASE_URL)" ]; then
  echo "LỖI: $ENV_WORKTREE thiếu VITE_SUPABASE_URL" >&2
  exit 1
fi

# 1) Không URL client nào được trỏ tới project prod.
for var in VITE_SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL; do
  val="$(env_value "$var")"
  if [ -n "$val" ] && printf '%s\n' "$val" | grep -qF "$PROD_REF"; then
    echo "LỖI: $var trỏ tới project prod ($PROD_REF) — từ chối tạo worktree." >&2
    echo "      Dùng project local/staging trong .env.worktree." >&2
    exit 1
  fi
done

# 2) Worktree không bao giờ được giữ secret server.
for var in SUPABASE_SECRET_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [ -n "$(env_value "$var")" ]; then
    echo "LỖI: $var được set non-empty trong $ENV_WORKTREE — từ chối tạo worktree." >&2
    echo "      Worktree không bao giờ được giữ secret server; dùng khoá local/staging." >&2
    exit 1
  fi
done

if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "LỖI: nhánh $BRANCH đã tồn tại. Xoá nhánh hoặc chọn ID khác." >&2
  exit 1
fi

if [ -e "$WORKTREE_PATH" ]; then
  echo "LỖI: đường dẫn đã tồn tại: $WORKTREE_PATH" >&2
  exit 1
fi

echo "→ git worktree add $WORKTREE_PATH -b $BRANCH"
git -C "$MAIN_ROOT" worktree add "$WORKTREE_PATH" -b "$BRANCH"

echo "→ copy .env.worktree -> $WORKTREE_PATH/.env"
cp "$ENV_WORKTREE" "$WORKTREE_PATH/.env"

cd "$WORKTREE_PATH"

if [ -f package-lock.json ]; then
  echo "→ npm ci"
  npm ci
elif [ -f bun.lock ]; then
  echo "→ bun install --frozen-lockfile"
  bun install --frozen-lockfile
else
  echo "LỖI: không thấy package-lock.json hay bun.lock trong $WORKTREE_PATH" >&2
  exit 1
fi

echo "✓ Worktree sẵn sàng: $WORKTREE_PATH (nhánh $BRANCH)"
