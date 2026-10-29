package kr.co.marihome.riverwidget;
import android.content.Context;
import android.graphics.Color;
final class WidgetStyle {
 static int titleFont(Context c){return Math.max(12,Math.min(24,c.getSharedPreferences("widget-style",0).getInt("titleFont",18)));}
 static void saveTitleFont(Context c,int size){c.getSharedPreferences("widget-style",0).edit().putInt("titleFont",Math.max(12,Math.min(24,size))).apply();}
 static int font(Context c){return Math.max(12,Math.min(18,c.getSharedPreferences("widget-style",0).getInt("font",14)));}
 static int transparency(Context c){return Math.max(0,Math.min(80,c.getSharedPreferences("widget-style",0).getInt("transparency",20)));}
 static int theme(Context c){android.content.SharedPreferences p=c.getSharedPreferences("widget-style",0);return Math.max(0,Math.min(2,p.getInt("theme",p.getBoolean("dark",false)?1:0)));}
 static boolean dark(Context c){return theme(c)==1;}
 static int text(Context c){return WidgetDesign.color(c,"schoolText",Color.parseColor(theme(c)==0?"#F1ECD7":theme(c)==1?"#F5F5F5":"#145C97"));}
 static int secondary(Context c){return text(c);}
 static int academyText(Context c){return WidgetDesign.color(c,"academyText",Color.parseColor(theme(c)==0?"#F1ECD7":theme(c)==1?"#52E5B1":"#FAF2D9"));}
 static int drawable(Context c){return theme(c)==0?R.drawable.widget_background_green:theme(c)==1?R.drawable.widget_background_dark:R.drawable.widget_background_sky;}
 static int panel(Context c,boolean academy){if(theme(c)==2&&academy)return R.drawable.widget_academy_blue;return theme(c)==0?R.drawable.widget_panel_green:theme(c)==1?R.drawable.widget_panel_dark:R.drawable.widget_background_sky;}
 static void save(Context c,int font,int theme,int transparency){c.getSharedPreferences("widget-style",0).edit().putInt("font",font).putInt("theme",theme).putInt("transparency",transparency).remove("corner").apply();RiverWidget.renderAll(c);}
 static int academyLimit(Context c){int n=c.getSharedPreferences("widget-style",0).getInt("academyLimit",3);return n==6||n==9?n:3;}
 static boolean schoolStatus(Context c,String status){boolean start="시작전".equals(status)||"시작 전".equals(status);return c.getSharedPreferences("widget-style",0).getBoolean(start?"showStart":"showProgress",true);}
 static void saveFilters(Context c,int limit,boolean start,boolean progress){c.getSharedPreferences("widget-style",0).edit().putInt("academyLimit",limit).putBoolean("showStart",start).putBoolean("showProgress",progress).apply();}
 static int todayColor(Context c,boolean academy){return Color.parseColor(theme(c)==0?"#B44077":theme(c)==1?"#F2A065":academy?"#D7A176":"#AD704B");}
 static int divider(Context c){return WidgetDesign.color(c,"divider",Color.parseColor("#407F5D"));}
 private WidgetStyle(){}
}

