package kr.co.marihome.riverwidget;
import android.content.Context;
import org.json.*;
import java.net.*;
import java.io.*;
import java.time.*;
import java.util.*;
final class Data {
 static final String API="https://choi-river-notion.hihana77.workers.dev";
 static final class Row {String id,kind,caption,sort;Row(String i,String k,String c,String s){id=i;kind=k;caption=c;sort=s;}}
 static JSONObject get(String path,String token) throws Exception {
  HttpURLConnection conn=(HttpURLConnection)new URL(API+path).openConnection();
  try{
   conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(6000);conn.setReadTimeout(6000);conn.setRequestProperty("Authorization","Bearer "+token);conn.setRequestProperty("Cache-Control","no-cache");
   int code=conn.getResponseCode();
   if(code==401)throw new Exception("접근 암호를 다시 연결해 주세요.");
   if(code!=200)throw new Exception("일정 연결 실패 · 새로고침해 주세요.");
   try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
    byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1){out.write(buffer,0,n);if(out.size()>2000000)throw new Exception("일정 데이터가 너무 많아요.");}
    return new JSONObject(out.toString("UTF-8"));
   }
  }finally{conn.disconnect();}
 }
 static void sync(Context c,String token) throws Exception {
  JSONObject school=get("/tasks",token),academy=get("/academy",token);
  if(!(school.opt("items") instanceof JSONArray)||!(academy.opt("items") instanceof JSONArray))throw new Exception("서버의 일정 형식을 확인해 주세요.");
  JSONObject all=new JSONObject();all.put("school",school.getJSONArray("items"));all.put("academy",academy.getJSONArray("items"));all.put("at",Instant.now().toString());
  Vault.put(c,"cache",all.toString());c.getSharedPreferences("river-state",0).edit().remove("error").apply();
 }
 static List<Row> rows(Context c){
  List<Row> academy=new ArrayList<>(),school=new ArrayList<>();Instant now=Instant.now();
  try{
   JSONObject cache=new JSONObject(Vault.get(c,"cache"));JSONArray aa=cache.optJSONArray("academy"),ss=cache.optJSONArray("school");
   if(aa!=null)for(int i=0;i<aa.length();i++){JSONObject x=aa.getJSONObject(i);String start=x.optString("start"),id=x.optString("id");
    if(!validId(id)||!Schedule.academyVisible(x.optString("status"),start,now))continue;
    String kind=x.optString("kind"),name="과학".equals(kind)?"과학":"PT",type=x.optString("subtype","수업");
    if("연습".equals(type))type="클리닉";
    String late=OffsetDateTime.parse(start).toInstant().isBefore(now)?" · 출석 확인":"";
    academy.add(new Row(id,"lesson",name+" "+type+" · "+Schedule.lessonTime(start)+late,start));
   }
   if(ss!=null)for(int i=0;i<ss.length();i++){JSONObject x=ss.getJSONObject(i);String due=x.optString("due"),id=x.optString("id");
    if(!validId(id)||!Schedule.schoolVisible(x.optString("status"),due,now))continue;
    JSONArray subjects=x.optJSONArray("subjects");String subject=subjects!=null&&subjects.length()>0?subjects.optString(0):"학교";
    school.add(new Row(id,"task",subject+" · "+x.optString("title","할 일")+" · "+Schedule.dueTime(due),due));
   }
  }catch(Exception ignored){}
  academy.sort(Comparator.comparing(x->x.sort));school.sort(Comparator.comparing(x->x.sort));academy.addAll(school);return academy;
 }
 static boolean validId(String id){return id!=null&&id.matches("[a-fA-F0-9-]{32,36}");}
 static void error(Context c,String message){c.getSharedPreferences("river-state",0).edit().putString("error",message).apply();}
 static String error(Context c){return c.getSharedPreferences("river-state",0).getString("error","");}
 static String updated(Context c){try{return new JSONObject(Vault.get(c,"cache")).optString("at");}catch(Exception e){return "";}}
 private Data(){}
}