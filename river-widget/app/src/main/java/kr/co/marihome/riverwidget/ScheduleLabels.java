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
 static String category(String category,String kind){
  if("학원".equals(category)||"교회".equals(category)||"약속".equals(category)||"기타".equals(category))return category;
  String value=kind==null?"":kind.trim();
  if(value.matches("^(학원|교회|약속|기타) · .+$"))return value.substring(0,value.indexOf(" · "));
  if("TEEN".equalsIgnoreCase(value)||"교회".equals(value))return "교회";
  if(value.matches("과학|바디PT|운동|수학|국어|영어|학원"))return "학원";
  return "약속".equals(value)?"약속":"기타";
 }
 static String detail(String title,String kind,String type,String round,String category){
  String group=category(category,kind);
  return "학원".equals(group)?detail(title,kind,type,round,true):group;
 }
 private ScheduleLabels(){}
}
