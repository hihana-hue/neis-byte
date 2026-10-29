package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
public class AcademyStatusTest{
 @Test public void todayIsBasedOnSeoulDateNotElapsedHour(){
  Instant now=Instant.parse("2026-10-21T10:30:00Z");
  assertEquals("오늘",Schedule.academyStatus("2026-10-21T19:00:00+09:00",now));
  assertEquals("오늘",Schedule.academyStatus("2026-10-21T20:00:00+09:00",now));
  assertEquals("확인 필요",Schedule.academyStatus("2026-10-20T19:00:00+09:00",now));
  assertEquals("예정",Schedule.academyStatus("2026-10-22T19:00:00+09:00",now));
 }
}
