package kr.co.marihome.riverwidget;
/** Notion schema snapshot, 2026-10-21. Live feed colors always take precedence. */
final class NotionSubjects {
 static String fallback(String subject) {
  switch(subject) {
   case "공통과학2": case "공통영어2": return "green";
   case "통합사회2": return "orange";
   case "공통국어1": case "공통수학1": case "공통영어1": case "공통과학1": case "통합사회": case "한국사": case "정보": return "blue";
   case "과탐실": case "음악": case "미술": case "체육": case "종교학": return "yellow";
   default: return "default";
  }
 }
 private NotionSubjects() {}
}

