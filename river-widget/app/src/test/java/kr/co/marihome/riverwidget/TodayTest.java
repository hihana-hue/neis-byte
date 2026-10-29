package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
public class TodayTest {
 @Test public void seoulMidnightAndSchoolDates(){Instant now=Instant.parse("2026-10-22T15:00:00Z");assertTrue(Schedule.isToday("2026-10-23",now,false));assertTrue(Schedule.isToday("2026-10-23T19:00:00+09:00",now,true));assertFalse(Schedule.isToday("2026-10-22",now,false));assertFalse(Schedule.isToday("bad",now,false));}
}

