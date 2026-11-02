package kr.co.marihome.riverwidget;
final class ScheduleLabels {
 static String title(String title,String kind){if(title!=null&&!title.trim().isEmpty())return title.trim();String fallback=kind==null?"":kind.replaceFirst("^(학원|교회|약속|기타) · ","").trim();return fallback.isEmpty()?"일정명 없음":fallback;}
 static String subject(String kind){return kind==null?"":kind.replaceFirst("^(학원|교회|약속|기타) · ","").trim().replaceFirst("^운동$","바디PT");}
 static String heading(String title,String kind,boolean academy){String label=subject(kind);return academy&&!label.isEmpty()?label:title(title,kind);}
 static String detail(String title,String kind,String type,String round,boolean academy){
  if(!academy)return "";
  String label=subject(kind),value=title==null?"":title.trim(),subtype="클리닉".equals(type)||"연습".equals(type)?"클리닉":"수업";
  String custom=value.isEmpty()||value.equals(label)||value.equals(kind)||value.equals(label+" 수업")||value.equals(label+" 클리닉")||value.equals(label+" 연습")?"":value;
  String result=(custom.isEmpty()?"":custom+" · ")+subtype;
  return "수업".equals(subtype)&&round!=null&&round.matches("[1-9][0-9]*/[1-9][0-9]*")?result+" · "+round+"회":result;
 }
 private ScheduleLabels(){}
}
