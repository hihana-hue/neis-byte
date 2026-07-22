"use client";

import { useMemo, useState } from "react";

type Field = { id: string; group: string; label: string; chars: number; bytes: number; note?: string; scope?: string };

const fields: Field[] = [
  { id: "autonomy", group: "창의적 체험활동상황", label: "자율·자치활동 특기사항", chars: 500, bytes: 1500, note: "3학년은 자율활동" },
  { id: "club", group: "창의적 체험활동상황", label: "동아리활동 특기사항", chars: 500, bytes: 1500 },
  { id: "career-12", group: "창의적 체험활동상황", label: "진로활동 특기사항 (고1·2)", chars: 500, bytes: 1500, note: "2026학년도 고1·2 기준" },
  { id: "career-3", group: "창의적 체험활동상황", label: "진로활동 특기사항 (고3)", chars: 700, bytes: 2100, note: "2026학년도 고3 기준" },
  { id: "subject", group: "교과학습발달상황", label: "과목별 세부능력 및 특기사항", chars: 500, bytes: 1500, note: "과목별 500자 · 공통과목 1·2 합산" },
  { id: "personal", group: "교과학습발달상황", label: "개인별 세부능력 및 특기사항", chars: 500, bytes: 1500 },
  { id: "behavior", group: "행동특성 및 종합의견", label: "행동특성 및 종합의견", chars: 300, bytes: 900 },
];

function byteOf(char: string) {
  if (char === "\n") return 1;
  return char.codePointAt(0)! <= 0x7f ? 1 : 3;
}

function byteLength(text: string) {
  return Array.from(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")).reduce((sum, char) => sum + byteOf(char), 0);
}

function sliceByBytes(text: string, limit: number) {
  let used = 0;
  let result = "";
  for (const char of Array.from(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))) {
    const size = byteOf(char);
    if (used + size > limit) break;
    used += size;
    result += char;
  }
  return result;
}

export default function Home() {
  const [fieldId, setFieldId] = useState("subject");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState("");
  const field = fields.find((item) => item.id === fieldId)!;
  const stats = useMemo(() => {
    const bytes = byteLength(text);
    const characters = Array.from(text).length;
    const noSpaces = Array.from(text.replace(/\s/g, "")).length;
    const lines = text ? text.replace(/\r\n/g, "\n").split("\n").length : 0;
    const fitted = sliceByBytes(text, field.bytes);
    const unusual = Array.from(text).some((char) => char !== "\n" && char.codePointAt(0)! > 0x7f && !/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char));
    return { bytes, characters, noSpaces, lines, fitted, unusual };
  }, [text, field.bytes]);
  const remaining = field.bytes - stats.bytes;
  const percent = Math.min(100, Math.round((stats.bytes / field.bytes) * 100));
  const over = remaining < 0;

  async function copy(value: string, message: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(message);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <main>
      <header className="topbar">
        <div className="header-inner">
          <div className="brand-icon" aria-hidden="true">✓</div>
          <div>
            <h1>2026 나이스 바이트 계산기</h1>
            <p>대학에 제공되는 학교생활기록부 항목만 계산합니다.</p>
          </div>
          <span className="official-badge">2026 학교생활기록부 기재요령 기준</span>
        </div>
      </header>

      <div className="page-shell">
        <section className="notice" aria-label="공식 기준 안내">
          <strong>교육부 공식 자료 반영</strong>
          <span>대입전형자료로 대학에 제공되는 항목만 표시하며, 항목별 목표 바이트는 변경할 수 없습니다.</span>
        </section>

        <div className="calculator-grid">
          <section className="editor-card">
            <label htmlFor="field">학교생활기록부 항목</label>
            <select id="field" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
              {fields.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.group} · {item.label} ({item.bytes.toLocaleString()}B)
                </option>
              ))}
            </select>
            <p className="scope-note">적용 대상: 일반고</p>
            <div className="field-meta">
              <span>공식 한글 기준 <b>{field.chars.toLocaleString()}자</b></span>
              <span>제한 <b>{field.bytes.toLocaleString()}B</b></span>
              {field.note && <span>{field.note}</span>}
            </div>

            <label htmlFor="content">내용 입력</label>
            <textarea
              id="content"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="내용을 입력하거나 붙여넣으세요. 입력 즉시 바이트와 글자 수를 계산합니다."
              spellCheck={true}
              autoCorrect="on"
            />
            <div className="privacy">ⓘ 입력한 내용은 서버에 저장되거나 전송되지 않습니다.</div>
            {stats.unusual && (
              <div className="warning">특수문자·이모지가 포함되어 있습니다. 실제 나이스 입력 화면에서 최종 확인하세요.</div>
            )}
          </section>

          <aside className="result-card" aria-live="polite">
            <div className="result-heading">
              <span>실시간 계산 결과</span>
              <span className={over ? "status over" : "status safe"}>{over ? "초과" : "입력 가능"}</span>
            </div>
            <div className="primary-stats">
              <article><span>현재 바이트</span><strong>{stats.bytes.toLocaleString()}B</strong></article>
              <article className={over ? "danger" : ""}><span>{over ? "초과 바이트" : "남은 바이트"}</span><strong>{Math.abs(remaining).toLocaleString()}B</strong></article>
            </div>
            <div className="secondary-stats">
              <span><b>{stats.characters.toLocaleString()}</b> 공백 포함</span>
              <span><b>{stats.noSpaces.toLocaleString()}</b> 공백 제외</span>
              <span><b>{stats.lines.toLocaleString()}</b> 줄</span>
            </div>
            <div className="progress-label"><b>{percent}%</b><span>{stats.bytes.toLocaleString()} / {field.bytes.toLocaleString()}B</span></div>
            <div className="progress"><span className={over ? "over-bar" : ""} style={{ width: `${percent}%` }} /></div>

            {over && (
              <div className="cut-preview">
                <strong>제한 맞춤 미리보기</strong>
                <p>{stats.fitted}<mark>{text.slice(stats.fitted.length)}</mark></p>
                <small>빨간 부분은 제한을 초과해 잘리는 영역입니다.</small>
              </div>
            )}

            <button className="primary-button" onClick={() => copy(text, "원문을 복사했습니다.")}>원문 복사</button>
            <button className="outline-button" onClick={() => copy(stats.fitted, `제한 ${field.bytes}B까지 복사했습니다.`)}>제한 안의 글 복사</button>
            <button className="clear-button" onClick={() => setText("")}>전체 지우기</button>
            {copied && <div className="toast">{copied}</div>}
          </aside>
        </div>

        <section className="rule-card">
          <div><strong>바이트 계산 기준</strong><span>한글 3B · 영문·숫자 1B · 엔터 1B</span></div>
          <p>출처: 교육부 「2026학년도 학교생활기록부 기재요령(고등학교)」 208쪽 및 대입전형자료 제공 기준. 수상경력·자격증 및 인증 취득상황·독서활동상황은 대학 미제공 항목이므로 제외했습니다. 최대 글자 수는 과목별 세부능력 및 특기사항을 제외하고 학년 단위 기준입니다.</p>
          <p><strong>맞춤법 검사 유의사항:</strong> 브라우저의 기본 오타·맞춤법 검사 기능을 사용합니다. 검사 결과는 100% 정확하지 않으므로 최종 문장은 반드시 직접 확인하세요.</p>
        </section>
        <footer>본 계산기는 나이스 입력 전 분량 확인을 돕는 참고 도구입니다. 최종 입력 가능 여부는 실제 나이스 화면에서 확인하세요.</footer>
      </div>
    </main>
  );
}
