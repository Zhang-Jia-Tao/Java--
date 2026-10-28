/**
 * 极简 Java 高亮：构建期运行，产出带行号锚点的 HTML，运行时零 JS。
 * 只处理注释 / 字符串 / 数字 / 关键字 / 类型 / 方法名六类，够用且不会误伤。
 */

const KEYWORDS = new Set([
  'abstract', 'assert', 'break', 'case', 'catch', 'class', 'continue', 'default', 'do', 'else',
  'enum', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import', 'instanceof',
  'interface', 'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'switch',
  'synchronized', 'throw', 'throws', 'try', 'while', 'yield', 'var', 'record'
]);

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double', 'void']);

const LITERALS = new Set(['true', 'false', 'null', 'this', 'super']);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface CodeLine {
  n: number;
  html: string;
  raw: string;
}

export function highlightJava(source: string): CodeLine[] {
  const srcLines = source.split('\n');
  const out: CodeLine[] = [];
  let inBlock = false;

  for (let i = 0; i < srcLines.length; i++) {
    const raw = srcLines[i];
    let html = '';
    let j = 0;

    while (j < raw.length) {
      if (inBlock) {
        const end = raw.indexOf('*/', j);
        if (end === -1) {
          html += `<span class="tk-cm">${esc(raw.slice(j))}</span>`;
          j = raw.length;
        } else {
          html += `<span class="tk-cm">${esc(raw.slice(j, end + 2))}</span>`;
          j = end + 2;
          inBlock = false;
        }
        continue;
      }

      const c = raw[j];

      if (c === '/' && raw[j + 1] === '/') {
        html += `<span class="tk-cm">${esc(raw.slice(j))}</span>`;
        break;
      }
      if (c === '/' && raw[j + 1] === '*') {
        inBlock = true;
        continue;
      }
      if (c === '"' || c === "'") {
        const q = c;
        let k = j + 1;
        let buf = c;
        while (k < raw.length) {
          const d = raw[k];
          if (d === '\\') {
            buf += d + (raw[k + 1] ?? '');
            k += 2;
            continue;
          }
          buf += d;
          k++;
          if (d === q) break;
        }
        html += `<span class="tk-str">${esc(buf)}</span>`;
        j = k;
        continue;
      }
      if (/[0-9]/.test(c)) {
        let k = j;
        while (k < raw.length && /[0-9a-fA-FxX._]/.test(raw[k])) k++;
        html += `<span class="tk-num">${esc(raw.slice(j, k))}</span>`;
        j = k;
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        let k = j;
        while (k < raw.length && /[A-Za-z0-9_$]/.test(raw[k])) k++;
        const word = raw.slice(j, k);
        if (KEYWORDS.has(word)) html += `<span class="tk-kw">${esc(word)}</span>`;
        else if (PRIMITIVES.has(word)) html += `<span class="tk-typ">${esc(word)}</span>`;
        else if (LITERALS.has(word)) html += `<span class="tk-num">${esc(word)}</span>`;
        else if (/^[A-Z]/.test(word)) html += `<span class="tk-typ">${esc(word)}</span>`;
        else if (raw[k] === '(') html += `<span class="tk-fn">${esc(word)}</span>`;
        else html += esc(word);
        j = k;
        continue;
      }

      html += esc(c);
      j++;
    }

    out.push({ n: i + 1, html: html.trimEnd() || '&nbsp;', raw });
  }

  return out;
}
