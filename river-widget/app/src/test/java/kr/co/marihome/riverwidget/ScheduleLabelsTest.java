package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class ScheduleLabelsTest {
 @Test public void actualTitleWinsOverSubjectAndCategory(){assertEquals("친구와 점심",ScheduleLabels.title("친구와 점심","약속"));assertEquals("과학",ScheduleLabels.title("과학","학원 · 수학"));assertEquals("TEEN",ScheduleLabels.title("TEEN","교회"));}
 @Test public void fallbackOmitsCategoryAndDoesNotRenameCustomTitles(){assertEquals("서예",ScheduleLabels.title("","학원 · 서예"));assertEquals("과학 28일 보강 2th",ScheduleLabels.title("과학 28일 보강 2th","과학"));}
 @Test public void academySubjectStaysAboveLessonAndRound(){assertEquals("과학",ScheduleLabels.heading("과학 수업","과학",true));assertEquals("수업 · 2/4회",ScheduleLabels.detail("과학 수업","과학","수업","2/4",true));assertEquals("클리닉",ScheduleLabels.detail("과학","과학","클리닉","(클)",true));assertEquals("바디PT",ScheduleLabels.heading("운동","운동",true));}
 @Test public void customTitlesArePreservedWithoutRepeatingGeneratedTitles(){assertEquals("과학 4일 보강 · 수업 · 3/4회",ScheduleLabels.detail("과학 4일 보강","과학","수업","3/4",true));assertEquals("친구와 점심",ScheduleLabels.heading("친구와 점심","약속",false));assertEquals("",ScheduleLabels.detail("친구와 점심","약속","수업","1/4",false));assertEquals("클리닉",ScheduleLabels.detail("과학 클리닉","학원 · 과학","클리닉","1/4",true));}
 @Test public void nonAcademyCategoriesUseTheSameSecondLine(){
  assertEquals("교회",ScheduleLabels.detail("TEEN 수업","TEEN","수업","","교회"));
  assertEquals("교회",ScheduleLabels.detail("Teen","Teen","수업","",""));
  assertEquals("약속",ScheduleLabels.detail("미용실","약속","수업","","약속"));
  assertEquals("기타",ScheduleLabels.detail("개인일정","기타","수업","","기타"));
  assertEquals("수업 · 3/5회",ScheduleLabels.detail("바디PT 수업","바디PT","수업","3/5","학원"));
  assertEquals("클리닉",ScheduleLabels.detail("과학 클리닉","과학","클리닉","","학원"));
 }
}
