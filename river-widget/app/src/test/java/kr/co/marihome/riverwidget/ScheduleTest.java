package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;
public class ScheduleTest {
 private final Instant monday=Instant.parse("2026-10-18T15:00:00Z");
 @Test public void koreanMondayHasSundayBoundary(){assertEquals(LocalDate.of(2026,10,19),Schedule.today(monday));assertEquals(LocalDate.of(2026,10,25),Schedule.sunday(monday));}
 @Test public void schoolOnlyThisWeekAndAllowedStatuses(){
  for(String status:new String[]{"시작전","진행 중","진행 2차","작성 완료"})assertTrue(Schedule.schoolVisible(status,"2026-10-25",monday));
  for(String status:new String[]{"완료","봉사완료","3.픽-예정","1.검토전",""})assertFalse(Schedule.schoolVisible(status,"2026-10-20",monday));
  assertFalse(Schedule.schoolVisible("시작전","2026-10-18",monday));assertFalse(Schedule.schoolVisible("시작전","2026-10-26",monday));
 }
 @Test public void missedAcademyStaysUntilAttendance(){
  assertTrue(Schedule.academyVisible("예정","2026-09-01T18:00:00+09:00",monday));
  assertTrue(Schedule.academyVisible("예정","2026-10-25T18:00:00+09:00",monday));
  assertFalse(Schedule.academyVisible("출석","2026-10-20T18:00:00+09:00",monday));assertFalse(Schedule.academyVisible("결석","2026-10-20T18:00:00+09:00",monday));
  assertFalse(Schedule.academyVisible("예정","2026-10-26T18:00:00+09:00",monday));
 }
 @Test public void datesNeverUsePhoneTimezone(){assertEquals("10/25 (일) 18:00",Schedule.lessonTime("2026-10-25T09:00:00Z"));assertFalse(Schedule.academyVisible("예정","bad",monday));assertFalse(Schedule.schoolVisible("시작전","bad",monday));}
}