package kr.co.marihome.riverwidget;
import android.content.Context;
import android.graphics.Color;
final class WidgetStyle {
 static int font(Context c){return Math.max(12,Math.min(18,c.getSharedPreferences("widget-style",0).getInt("font",14)));}
 static int transparency(Context c){return Math.max(0,Math.min(80,c.getSharedPreferences("widget-style",0).getInt("transparency",20)));}
 static int theme(Context c){android.content.SharedPreferences p=c.getSharedPreferences("widget-style",0);return Math.max(0,Math.min(2,p.getInt("theme",p.getBoolean("dark",false)?1:0)));}
 static boolean dark(Context c){return theme(c)==1;}
 static int text(Context c){return Color.parseColor(theme(c)==0?"#F1ECD7":theme(c)==1?"#F5F5F5":"#145C97");}
 static int secondary(Context c){return Color.parseColor(theme(c)==0?"#E0E6CF":theme(c)==1?"#D0D0D0":"#145C97");}
 static int academyText(Context c){return Color.parseColor(theme(c)==0?"#F1ECD7":theme(c)==1?"#D9FF00":"#FAF2D9");}
 static int drawable(Context c){return theme(c)==0?R.drawable.widget_background_green:theme(c)==1?R.drawable.widget_background_dark:R.drawable.widget_background_sky;}
 static int panel(Context c,boolean academy){if(theme(c)==2&&academy)return R.drawable.widget_academy_blue;return theme(c)==0?R.drawable.widget_panel_green:theme(c)==1?R.drawable.widget_panel_dark:R.drawable.widget_background_sky;}
 static void save(Context c,int font,int theme,int transparency){c.getSharedPreferences("widget-style",0).edit().putInt("font",font).putInt("theme",theme).putInt("transparency",transparency).remove("corner").apply();RiverWidget.renderAll(c);}
 private WidgetStyle(){}
}
