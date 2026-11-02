package kr.co.marihome.riverwidget;
final class ScheduleLabels {
 static String title(String title,String kind){if(title!=null&&!title.trim().isEmpty())return title.trim();String fallback=kind==null?"":kind.replaceFirst("^(학원|교회|약속|기타) · ","").trim();return fallback.isEmpty()?"일정명 없음":fallback;}
 private ScheduleLabels(){}
}
