package kr.co.marihome.riverwidget;
import android.content.Context;
import android.graphics.Color;
final class WidgetStyle {
 static int font(Context c){return Math.max(12,Math.min(18,c.getSharedPreferences("widget-style",0).getInt("font",14)));}
 static int transparency(Context c){return Math.max(0,Math.min(80,c.getSharedPreferences("widget-style",0).getInt("transparency",20)));}
 static boolean dark(Context c){return c.getSharedPreferences("widget-style",0).getBoolean("dark",false);}
 static int text(Context c){return Color.parseColor(dark(c)?"#F0F5FA":"#23485E");}
 static int secondary(Context c){return Color.parseColor(dark(c)?"#C4D9EC":"#53768A");}
 static int drawable(Context c){return dark(c)?R.drawable.widget_background_dark:R.drawable.widget_background;}
 static void save(Context c,int font,boolean dark,int transparency){c.getSharedPreferences("widget-style",0).edit().putInt("font",font).putBoolean("dark",dark).putInt("transparency",transparency).remove("corner").apply();RiverWidget.renderAll(c);}
 private WidgetStyle(){}
}
