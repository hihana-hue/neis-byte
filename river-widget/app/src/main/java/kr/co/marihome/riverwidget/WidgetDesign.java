package kr.co.marihome.riverwidget;
import android.content.Context;
import android.graphics.Color;
import org.json.*;
/** Explicitly refreshed Notion designs. No timers or network calls in this class. */
final class WidgetDesign {
 static final String[] IDS={"407215b9-b774-8000-b436-e28e5cd87fcb","407215b9-b774-8116-9598-d4d90e9d11b4","407215b9-b774-80e4-8901-d5f6c8573ecc"};
 static final String[] COLORS={"background","titleColor","academyBackground","academyText","separator","schoolBackground","schoolText","divider","today"};
 static JSONArray defaults(){
  JSONArray a=new JSONArray();String[][] values={{"그린","#286F49","#F1ECD7","#307852","#F1ECD7","#F1ECD7","#B44077"},{"블랙","#0C0C0C","#F5F5F5","#191919","#52E5B1","#F5F5F5","#F2A065"},{"스카이블루","#FAF6DA","#145C97","#286599","#FAF2D9","#145C97","#D7A176"}};
  try{for(int i=0;i<3;i++){String[] v=values[i];a.put(new JSONObject().put("id",IDS[i]).put("name",v[0]).put("background",v[1]).put("titleColor",v[2]).put("academyBackground",v[3]).put("academyText",v[4]).put("schoolText",v[5]).put("today",v[6]).put("divider","#407F5D").put("separator","#FFFFFF").put("schoolBackground","none").put("titleBold",true).put("academyBold",true).put("separatorTransparency",0).put("isDefault",i==0));}}catch(JSONException ignored){}return a;
 }
 static JSONArray list(Context c){try{JSONArray a=new JSONArray(Vault.get(c,"designs"));if(a.length()>0)return a;}catch(Exception ignored){}return defaults();}
 static JSONObject find(JSONArray a,String id){for(int i=0;i<a.length();i++){JSONObject d=a.optJSONObject(i);if(d!=null&&id.equals(d.optString("id")))return d;}return null;}
 static String selectedId(Context c){String id=c.getSharedPreferences("widget-style",0).getString("designId","");return id.isEmpty()?IDS[WidgetStyle.theme(c)]:id;}
 static JSONObject selected(Context c){JSONObject d=find(list(c),selectedId(c));if(d!=null)return d;try{return new JSONObject(Vault.get(c,"designSnapshot"));}catch(Exception ignored){return defaults().optJSONObject(WidgetStyle.theme(c));}}
 static int selectedIndex(Context c){JSONArray a=list(c);for(int i=0;i<a.length();i++)if(selectedId(c).equals(a.optJSONObject(i).optString("id")))return i;return -1;}
 static boolean choose(Context c,String id){JSONObject d=find(list(c),id);if(d==null)return false;try{Vault.put(c,"designSnapshot",d.toString());c.getSharedPreferences("widget-style",0).edit().putString("designId",id).apply();return true;}catch(Exception e){return false;}}
 static boolean validColor(String s){return s!=null&&s.matches("#[0-9a-fA-F]{6}");}
 static void store(Context c,JSONObject response)throws Exception{
  if(response.optInt("schemaVersion")!=1)throw new Exception("디자인 서버를 업데이트해 주세요.");
  JSONArray source=response.optJSONArray("designs"),old=list(c),clean=new JSONArray();if(source==null||source.length()>100)throw new Exception("디자인 설정 형식을 확인해 주세요.");
  java.util.HashSet<String> seen=new java.util.HashSet<>();
  for(int i=0;i<source.length();i++){JSONObject x=source.optJSONObject(i);if(x==null)continue;String id=x.optString("id"),name=x.optString("name").trim();if(!id.matches("[a-fA-F0-9-]{32,36}")||name.isEmpty()||name.length()>100||!seen.add(id))continue;
   JSONObject previous=find(old,id),d=new JSONObject((previous==null?defaults().optJSONObject(WidgetStyle.theme(c)):previous).toString());d.put("id",id).put("name",name);
   for(String key:COLORS){String value=x.optString(key,"");if(validColor(value)||("schoolBackground".equals(key)&&"none".equals(value)))d.put(key,value);}
   for(String key:new String[]{"titleBold","academyBold","isDefault"})if(x.opt(key) instanceof Boolean)d.put(key,x.getBoolean(key));if(x.has("separatorTransparency")){int n=x.optInt("separatorTransparency",-1);if(n>=0&&n<=100)d.put("separatorTransparency",n);}clean.put(d);
  }
  if(clean.length()==0)throw new Exception("사용할 디자인이 없어요. 기존 디자인을 유지합니다.");
  JSONObject before=selected(c);Vault.put(c,"designSnapshot",before.toString());Vault.put(c,"designs",clean.toString());android.content.SharedPreferences prefs=c.getSharedPreferences("widget-style",0);
  if(!prefs.getBoolean("designInitialized",false)&&!prefs.contains("designId")&&!prefs.contains("theme")){
   String initial=initialDefault(clean);if(!initial.isEmpty()&&choose(c,initial))prefs.edit().putBoolean("designInitialized",true).apply();
  }
  JSONObject current=find(clean,selectedId(c));if(current!=null)Vault.put(c,"designSnapshot",current.toString());
  Vault.put(c,"academyIcons",null);
 }
 static String initialDefault(JSONArray designs){String id="";int count=0;for(int i=0;i<designs.length();i++){JSONObject d=designs.optJSONObject(i);if(d!=null&&d.optBoolean("isDefault")){id=d.optString("id");count++;}}return count>1?"":count==1?id:find(designs,IDS[0])!=null?IDS[0]:"";}
 static int separatorAlpha(Context c){return alpha(selected(c).optInt("separatorTransparency",0));}
 static int alpha(int transparency){return Math.round((100-Math.max(0,Math.min(100,transparency)))*2.55f);}
 static int color(Context c,String key,int fallback){String s=selected(c).optString(key);return validColor(s)?Color.parseColor(s):("schoolBackground".equals(key)&&"none".equals(s)?Color.TRANSPARENT:fallback);}
 static boolean bold(Context c,String key){return selected(c).optBoolean(key,true);}
 private WidgetDesign(){}
}
