package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class ScheduleLabelsTest {
 @Test public void actualTitleWinsOverSubjectAndCategory(){assertEquals("친구와 점심",ScheduleLabels.title("친구와 점심","약속"));assertEquals("과학",ScheduleLabels.title("과학","학원 · 수학"));assertEquals("TEEN",ScheduleLabels.title("TEEN","교회"));}
 @Test public void fallbackOmitsCategoryAndDoesNotRenameCustomTitles(){assertEquals("서예",ScheduleLabels.title("","학원 · 서예"));assertEquals("과학 28일 보강 2th",ScheduleLabels.title("과학 28일 보강 2th","과학"));}
}
