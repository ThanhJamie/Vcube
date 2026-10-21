#!/usr/bin/env node
/**
 * sync-mattpocock-skills.mjs — vendor bộ skill "Skills For Real Engineers"
 * (https://github.com/mattpocock/skills) vào `.opencode/` của repo này.
 *
 * Sinh ra:
 *   - `.opencode/skills/<id>/`        — 27 skill đã promote (`skills/engineering` + `skills/productivity`)
 *   - `.opencode/commands/<id>.md`    — 1 slash command cho mỗi skill loại user-invoked
 *                                     (frontmatter `disable-model-invocation: true` ⇒ opencode ẩn khỏi
 *                                     danh sách của model, người dùng gọi bằng `/id` hoặc `@id`)
 *   - `.opencode/mattpocock-skills.json` — manifest nguồn gốc (commit đã vendor + danh sách đã cài)
 *
 * Chạy:
 *   node scripts/sync-mattpocock-skills.mjs                  # đồng bộ từ nhánh mặc định, ghi file
 *   node scripts/sync-mattpocock-skills.mjs --ref <git-ref>   # ghim branch/tag/commit
 *   node scripts/sync-mattpocock-skills.mjs --check           # chỉ so sánh, không ghi (RC=1 nếu lệch)
 *   node scripts/sync-mattpocock-skills.mjs --dry-run         # in kế hoạch, không ghi
 *
 * Script chỉ xoá những gì chính nó đã tạo (đối chiếu manifest), không đụng
 * skill/command viết tay như `.opencode/skills/web-improvement-loop`.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_REPO = 'https://github.com/mattpocock/skills.git';
const BUCKETS = ['engineering', 'productivity'];
const SKILLS_DIR = join(ROOT, '.opencode', 'skills');
const COMMANDS_DIR = join(ROOT, '.opencode', 'commands');
const MANIFEST_PATH = join(ROOT, '.opencode', 'mattpocock-skills.json');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const CHECK = flag('--check');
const DRY_RUN = flag('--dry-run');
const REF = value('--ref');

// ---------------------------------------------------------------- frontmatter

/** Lấy giá trị scalar của `key:` trong frontmatter (hỗ trợ chuỗi quote nhiều dòng). */
function scalar(frontmatter, key) {
  const re = new RegExp(`^${key}:[ \\t]*`, 'm');
  const hit = re.exec(frontmatter);
  if (!hit) return undefined;
  const rest = frontmatter.slice(hit.index + hit[0].length);
  const quote = rest[0];
  if (quote !== '"' && quote !== "'") return rest.split(/\r?\n/)[0].trim();
  let out = '';
  for (let i = 1; i < rest.length; i += 1) {
    const ch = rest[i];
    if (quote === '"' && ch === '\\') {
      out += rest[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (ch === quote) {
      if (quote === "'" && rest[i + 1] === "'") {
        out += "'";
        i += 1;
        continue;
      }
      break;
    }
    out += ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** `{ description, userInvoked }` đọc từ SKILL.md. */
function readSkillMeta(skillDir) {
  const raw = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
  return {
    description: scalar(fm, 'description') ?? '',
    userInvoked: scalar(fm, 'disable-model-invocation') === 'true',
  };
}

// -------------------------------------------------------------------- nguồn

function withUpstream(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'mp-skills-'));
  try {
    execFileSync('git', ['clone', '--quiet', '--depth', '1', SOURCE_REPO, tmp], { stdio: 'inherit' });
    if (REF) {
      execFileSync('git', ['-C', tmp, 'fetch', '--quiet', '--depth', '1', 'origin', REF], { stdio: 'inherit' });
      execFileSync('git', ['-C', tmp, 'checkout', '--quiet', 'FETCH_HEAD'], { stdio: 'inherit' });
    }
    const sha = execFileSync('git', ['-C', tmp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const committedAt = execFileSync('git', ['-C', tmp, 'log', '-1', '--format=%cd', '--date=short'], { encoding: 'utf8' }).trim();
    return fn({ dir: tmp, sha, committedAt });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Danh sách skill trong 2 bucket đã promote, giữ nguyên thứ tự bucket rồi theo tên. */
function collectSkills(upstream) {
  const found = [];
  for (const bucket of BUCKETS) {
    const bucketDir = join(upstream, 'skills', bucket);
    for (const name of readdirSync(bucketDir).sort()) {
      const dir = join(bucketDir, name);
      if (!statSync(dir).isDirectory() || !existsSync(join(dir, 'SKILL.md'))) continue;
      found.push({ name, bucket, dir, ...readSkillMeta(dir) });
    }
  }
  return found;
}

// ------------------------------------------------------------------- tiện ích

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

/** So sánh cây upstream với bản đã vendor; trả về danh sách file lệch. */
function diffTree(from, to) {
  const drift = [];
  for (const rel of walk(from)) {
    const target = join(to, rel);
    if (!existsSync(target)) drift.push(`${rel} (thiếu)`);
    else if (readFileSync(join(from, rel)).compare(readFileSync(target)) !== 0) drift.push(`${rel} (khác nội dung)`);
  }
  for (const rel of walk(to)) if (!existsSync(join(from, rel))) drift.push(`${rel} (thừa)`);
  return drift;
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return { skills: [], commands: [] };
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { skills: [], commands: [] };
  }
}

function commandFile(skill) {
  const description = skill.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [
    '---',
    `description: "${description}"`,
    '---',
    '',
    `Call the skill tool with id "${skill.name}". Then follow that skill's instructions exactly.`,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------- main

const manifest = readManifest();
const previousSkills = new Set(manifest.skills ?? []);
const previousCommands = new Set(manifest.commands ?? []);
const log = (...msg) => console.log(...msg);

withUpstream(({ dir, sha, committedAt }) => {
  const skills = collectSkills(dir);
  const commands = skills.filter((s) => s.userInvoked);
  const drift = [];
  const planned = { skills: [], commands: [] };

  for (const skill of skills) {
    const target = join(SKILLS_DIR, skill.name);
    if (CHECK) {
      const d = existsSync(target) ? diffTree(skill.dir, target) : ['(chưa cài)'];
      for (const item of d) drift.push(`.opencode/skills/${skill.name}/${item}`);
    } else if (!DRY_RUN) {
      rmSync(target, { recursive: true, force: true });
      mkdirSync(target, { recursive: true });
      cpSync(skill.dir, target, { recursive: true });
    }
    planned.skills.push(skill.name);
  }

  for (const skill of commands) {
    const target = join(COMMANDS_DIR, `${skill.name}.md`);
    const content = commandFile(skill);
    if (CHECK) {
      if (!existsSync(target)) drift.push(`.opencode/commands/${skill.name}.md (thiếu)`);
      else if (readFileSync(target, 'utf8') !== content) drift.push(`.opencode/commands/${skill.name}.md (khác nội dung)`);
    } else if (!DRY_RUN) {
      mkdirSync(COMMANDS_DIR, { recursive: true });
      writeFileSync(target, content);
    }
    planned.commands.push(skill.name);
  }

  // Dọn phần do lần đồng bộ trước tạo ra mà nguồn không còn.
  const removed = [];
  for (const stale of previousSkills) {
    if (planned.skills.includes(stale)) continue;
    removed.push(`.opencode/skills/${stale}`);
    if (!CHECK && !DRY_RUN) rmSync(join(SKILLS_DIR, stale), { recursive: true, force: true });
  }
  for (const stale of previousCommands) {
    if (planned.commands.includes(stale)) continue;
    removed.push(`.opencode/commands/${stale}.md`);
    if (!CHECK && !DRY_RUN) rmSync(join(COMMANDS_DIR, `${stale}.md`), { force: true });
  }

  const byBucket = BUCKETS.map((b) => `${b} ${skills.filter((s) => s.bucket === b).length}`).join(' + ');
  log(`nguồn: ${SOURCE_REPO} @ ${sha.slice(0, 10)} (${committedAt})${REF ? ` [--ref ${REF}]` : ''}`);
  log(`tìm thấy: ${skills.length} skill (${byBucket}) → ${commands.length} user-invoked, ${skills.length - commands.length} model-invoked`);
  if (removed.length) log(`gỡ: ${removed.join(', ')}`);

  if (CHECK) {
    if (drift.length) {
      log(`LỆCH (${drift.length}):`);
      for (const item of drift) log(`  - ${item}`);
      log('→ chạy lại `npm run skills:sync` để cập nhật.');
      process.exitCode = 1;
    } else {
      log('khớp: bản vendor trong .opencode/ đúng bằng nguồn.');
    }
    return;
  }

  if (DRY_RUN) {
    log('dry-run: không ghi file nào.');
    return;
  }

  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        source: 'https://github.com/mattpocock/skills',
        ref: REF ?? 'HEAD',
        commit: sha,
        committedAt,
        syncedAt: new Date().toISOString().slice(0, 10),
        buckets: BUCKETS,
        skills: planned.skills,
        commands: planned.commands,
      },
      null,
      2,
    )}\n`,
  );
  log(`đã ghi: ${planned.skills.length} skill → .opencode/skills/, ${planned.commands.length} command → .opencode/commands/`);
  log('manifest: .opencode/mattpocock-skills.json');
});
