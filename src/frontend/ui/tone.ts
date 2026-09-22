/**
 * Tone — lớp bề mặt mà primitive đang render lên đó.
 *
 * `light` (mặc định): nền sáng hiện tại — MỌI class giữ nguyên như trước.
 * `chrome`: nền tối cố định của console (`--color-chrome*`) — sidebar/console tối.
 *
 * Dùng prop `tone` thay vì ghép `bg-chrome` đè `bg-surface`: `cn()` KHÔNG merge
 * xung đột utility (xem `cn.ts`) nên hai class nền chồng nhau sẽ phụ thuộc thứ tự CSS.
 */
export type Tone = 'light' | 'chrome';
