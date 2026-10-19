package kr.co.marihome.riverwidget;
import java.time.*;
import java.time.format.DateTimeFormatter;
public final class Schedule {
 static final ZoneId SEOUL=ZoneId.of("Asia/Seoul");
 static LocalDate today(Instant now){return now.atZone(SEOUL).toLocalDate();}
 static LocalDate sunday(Instant now){LocalDate d=today(now);return d.plusDays(7-d.getDayOfWeek().getValue());}
 static boolean schoolVisible(String status,String due,Instant now){
  if(!("시작전".equals(status)||"진행 중".equals(status)||"진행 2차".equals(status)||"작성 완료".equals(status)))return false;
  try{LocalDate d=LocalDate.parse(due.substring(0,10));return !d.isBefore(today(now))&&!d.isAfter(sunday(now));}catch(Exception e){return false;}
 }
 static boolean academyVisible(String status,String start,Instant now){
  if(!"예정".equals(status))return false;
  try{return !OffsetDateTime.parse(start).atZoneSameInstant(SEOUL).toLocalDate().isAfter(sunday(now));}catch(Exception e){return false;}
 }
 static String lessonTime(String start){try{return OffsetDateTime.parse(start).atZoneSameInstant(SEOUL).format(DateTimeFormatter.ofPattern("M/d (E) HH:mm",java.util.Locale.KOREAN));}catch(Exception e){return "시간 확인";}}
 static String dueTime(String due){try{return LocalDate.parse(due.substring(0,10)).format(DateTimeFormatter.ofPattern("M/d"));}catch(Exception e){return "";}}
 static String lessonDate(String start){try{return OffsetDateTime.parse(start).atZoneSameInstant(SEOUL).format(DateTimeFormatter.ofPattern("M.dd.(E)",java.util.Locale.KOREAN));}catch(Exception e){return "날짜 확인";}}
 static String lessonClock(String start){try{return OffsetDateTime.parse(start).atZoneSameInstant(SEOUL).format(DateTimeFormatter.ofPattern("a h:mm",java.util.Locale.KOREAN));}catch(Exception e){return "시간 확인";}}
 private Schedule(){}
}