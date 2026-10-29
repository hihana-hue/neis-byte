package kr.co.marihome.riverwidget;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.Normalizer;
import java.util.Locale;
final class AcademyIcons {
 static String key(String name){String k=Normalizer.normalize(name==null?"":name,Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT);return "운동".equals(k)?"바디pt":k;}
 static String selected(Context c,String name){try{JSONObject saved=new JSONObject(Vault.get(c,"academyIcons"));if(!saved.optString("studentId").replace("-","").equals(Data.studentId(c).replace("-","")))return "";JSONObject icons=saved.optJSONObject("icons");return icons==null?"":icons.optString(key(name),"");}catch(Exception e){return "";}}
 static int resource(String name){switch(name==null?"":name){
  case "책":return R.drawable.academy_icon_book;
  case "연필":return R.drawable.academy_icon_pencil;
  case "실험병":return R.drawable.academy_icon_flask;
  case "원자":return R.drawable.academy_icon_atom;
  case "계산기":return R.drawable.academy_icon_calculator;
  case "지구":return R.drawable.academy_icon_globe;
  case "컴퓨터":return R.drawable.academy_icon_computer;
  case "음표":return R.drawable.academy_icon_music;
  case "건반":return R.drawable.academy_icon_piano;
  case "기타":return R.drawable.academy_icon_guitar;
  case "마이크":return R.drawable.academy_icon_mic;
  case "팔레트":return R.drawable.academy_icon_palette;
  case "카메라":return R.drawable.academy_icon_camera;
  case "덤벨":return R.drawable.academy_icon_dumbbell;
  case "축구공":return R.drawable.academy_icon_soccer;
  case "농구공":return R.drawable.academy_icon_basketball;
  case "수영":return R.drawable.academy_icon_swim;
  case "달리기":return R.drawable.academy_icon_run;
  case "태권도":return R.drawable.academy_icon_martial;
  case "십자가":return R.drawable.academy_icon_cross;
  case "교회":return R.drawable.academy_icon_church;
  case "별":return R.drawable.academy_icon_star;
  case "하트":return R.drawable.academy_icon_heart;
  case "버스":return R.drawable.academy_icon_bus;
  default:return 0;
 }}
 static void render(Context c,RemoteViews views,int viewId,String name){int resource=resource(name);views.setViewVisibility(viewId,resource==0?View.GONE:View.VISIBLE);if(resource==0)return;views.setImageViewResource(viewId,resource);views.setInt(viewId,"setColorFilter",WidgetStyle.academyText(c));}
 private AcademyIcons(){}
}
