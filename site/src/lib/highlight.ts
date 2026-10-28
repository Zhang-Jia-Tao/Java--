/**
 * 极简 Java 高亮：构建期运行，产出带行号锚点的 HTML，运行时零 JS。
 * 只在注释 / 字符串 / 数字 / 关键字 / 类型 / 方法名 / 注解 / 运算符 八类上着色，
 * 够用、可读，且不会把代码搅成调色板。
 */

const KEYWORDS = new Set([
  'abstract', 'assert', 'break', 'case', 'catch', 'class', 'continue', 'default', 'do', 'else',
  'enum', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import', 'instanceof',
  'interface', 'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'switch',
  'synchronized', 'throw', 'throws', 'try', 'while', 'yield', 'var', 'record'
]);

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double', 'void']);

const LITERALS = new Set(['true', 'false', 'null', 'this', 'super']);

const OPERATORS = new Set([
  '=', '+', '-', '*', '/', '%', '<', '>', '!', '&', '|', '^', '~',
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '?', ':'
]);

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
      // 注解 @Override
      if (c === '@' && /[A-Za-z]/.test(raw[j + 1] ?? '')) {
        let k = j + 1;
        while (k < raw.length && /[A-Za-z0-9_$]/.test(raw[k])) k++;
        html += `<span class="tk-anno">${esc(raw.slice(j, k))}</span>`;
        j = k;
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
        else if (LITERALS.has(word)) html += `<span class="tk-lit">${esc(word)}</span>`;
        else if (/^[A-Z]/.test(word)) html += `<span class="tk-cls">${esc(word)}</span>`;
        else if (raw[k] === '(') html += `<span class="tk-fn">${esc(word)}</span>`;
        else html += esc(word);
        j = k;
        continue;
      }
      // 两字符运算符
      const two = raw.slice(j, j + 2);
      if (OPERATORS.has(two)) {
        html += `<span class="tk-op">${esc(two)}</span>`;
        j += 2;
        continue;
      }
      if (OPERATORS.has(c)) {
        html += `<span class="tk-op">${esc(c)}</span>`;
        j++;
        continue;
      }
      if (c === '{' || c === '}') {
        html += `<span class="tk-br">${esc(c)}</span>`;
        j++;
        continue;
      }

      html += esc(c);
      j++;
    }

    out.push({ n: i + 1, html: html.trimEnd() || '&nbsp;', raw });
  }

  return out;
}
