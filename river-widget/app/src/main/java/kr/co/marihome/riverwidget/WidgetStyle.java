package kr.co.marihome.riverwidget;
import android.content.Context;
final class WidgetStyle {
 static int font(Context c){return Math.max(12,Math.min(18,c.getSharedPreferences("widget-style",0).getInt("font",14)));}
 static int corner(Context c){int n=c.getSharedPreferences("widget-style",0).getInt("corner",4);return n==0||n==4||n==8||n==12?n:4;}
 static int transparency(Context c){return Math.max(0,Math.min(80,c.getSharedPreferences("widget-style",0).getInt("transparency",33)));}
 static int drawable(Context c){switch(corner(c)){case 0:return R.drawable.widget_background_square;case 8:return R.drawable.widget_background_medium;case 12:return R.drawable.widget_background_round;default:return R.drawable.widget_background;}}
 static void save(Context c,int font,int corner,int transparency){c.getSharedPreferences("widget-style",0).edit().putInt("font",font).putInt("corner",corner).putInt("transparency",transparency).apply();RiverWidget.renderAll(c);}
 private WidgetStyle(){}
}
