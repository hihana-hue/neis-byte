package kr.co.marihome.riverwidget;
final class LayoutRules {
 static int academyBottom(int lessons,boolean nextLesson){return lessons==6&&nextLesson?6:12;}
 static int academyDateFont(int body){return Math.max(11,body-1);}
 static int academyTimeFont(int body){return Math.max(10,body-3);}
 private LayoutRules(){}
}
