package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;
public class ScheduleTest {
 private final Instant monday=Instant.parse("2026-10-18T15:00:00Z");
 @Test public void koreanMondayHasSundayBoundary(){assertEquals(LocalDate.of(2026,10,19),Schedule.today(monday));assertEquals(LocalDate.of(2026,10,25),Schedule.sunday(monday));}
 @Test public void schoolUsesSelectedStatusesAcrossDates(){
  for(String status:new String[]{"시작전","진행 중","진행 2차","작성 완료"})assertTrue(Schedule.schoolVisible(status,"2026-10-25",monday));
  for(String status:new String[]{"완료","봉사완료","3.픽-예정","1.검토전",""})assertFalse(Schedule.schoolVisible(status,"2026-10-20",monday));
  assertTrue(Schedule.schoolVisible("시작전","2026-10-18",monday));assertTrue(Schedule.schoolVisible("시작전","2026-10-26",monday));
 }
 @Test public void missedAcademyStaysUntilAttendance(){
  assertTrue(Schedule.academyVisible("예정","2026-09-01T18:00:00+09:00",monday));
  assertTrue(Schedule.academyVisible("예정","2026-10-25T18:00:00+09:00",monday));
  assertFalse(Schedule.academyVisible("출석","2026-10-20T18:00:00+09:00",monday));assertFalse(Schedule.academyVisible("결석","2026-10-20T18:00:00+09:00",monday));
  assertTrue(Schedule.academyVisible("예정","2026-10-26T18:00:00+09:00",monday));
  assertTrue(Schedule.academyVisible("예정","2026-10-29T20:20:00+09:00",monday));
 }
 @Test public void progressRemainsVisibleBeyondWeekOrWithoutDue(){
  assertFalse(Schedule.schoolVisible("진행 중","2026-11-07",monday));
  assertFalse(Schedule.schoolVisible("진행 중","",monday));
  assertFalse(Schedule.schoolVisible("완료","2026-11-07",monday));
 }
 @Test public void schoolRollingTwoWeeksIncludesBothBoundaries(){
  assertTrue(Schedule.schoolVisible("진행 중","2026-10-19",monday));
  assertTrue(Schedule.schoolVisible("시작전","2026-11-02",monday));
  assertFalse(Schedule.schoolVisible("진행 중","2026-11-03",monday));
 }
 @Test public void dateOnlyPersonalSchedulesRemainVisible(){assertTrue(Schedule.academyVisible("예정","2026-10-19",monday));assertEquals("10.19.(월)",Schedule.lessonDate("2026-10-19"));assertEquals("시간 미정",Schedule.lessonClock("2026-10-19"));assertTrue(Schedule.isToday("2026-10-19",monday,true));assertTrue(Schedule.needsAttention("2026-10-18",monday,true));assertFalse(Schedule.academyVisible("완료","2026-10-19",monday));assertEquals(Instant.parse("2026-10-18T15:00:00Z"),Schedule.lessonInstant("2026-10-19"));}
 @Test public void datesNeverUsePhoneTimezone(){assertEquals("10/25 (일) 18:00",Schedule.lessonTime("2026-10-25T09:00:00Z"));assertFalse(Schedule.academyVisible("예정","bad",monday));assertFalse(Schedule.schoolVisible("시작전","bad",monday));}
 @Test public void schoolCountdownUsesSeoulCalendarDays(){
  Instant beforeMidnight=Instant.parse("2026-11-02T14:59:59Z"),midnight=Instant.parse("2026-11-02T15:00:00Z");
  assertEquals("",Schedule.schoolCountdown("2026-11-06",beforeMidnight));
  assertEquals("D-3",Schedule.schoolCountdown("2026-11-06",midnight));
  assertEquals("D-2",Schedule.schoolCountdown("2026-11-05",midnight));assertEquals("D-1",Schedule.schoolCountdown("2026-11-04",midnight));
  assertEquals("",Schedule.schoolCountdown("2026-11-07",midnight));assertEquals("D+2",Schedule.schoolCountdown("2026-11-01",midnight));
  assertEquals("D-DAY",Schedule.schoolCountdown("2026-11-03",midnight));
  assertEquals("D+1",Schedule.schoolCountdown("2026-11-02",midnight));
  assertEquals("D-1",Schedule.schoolCountdown("2027-01-01",Instant.parse("2026-12-30T15:00:00Z")));
  assertEquals("D-2",Schedule.schoolCountdown("2028-03-01",Instant.parse("2028-02-27T15:00:00Z")));
  assertEquals("",Schedule.schoolCountdown("",midnight));assertEquals("",Schedule.schoolCountdown("bad",midnight));
 }
}
