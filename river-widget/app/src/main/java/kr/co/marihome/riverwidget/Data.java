package kr.co.marihome.riverwidget;
import android.content.Context;
import org.json.*;
import java.net.*;
import java.io.*;
import java.time.*;
import java.util.*;
final class Data {
 static final String API="https://choi-river-notion.hihana77.workers.dev";
 static final class Row {String id,kind,caption,sort,subject="",subjectColor="default",title="",due="",date="",time="",detail="";Row(String i,String k,String c,String s){id=i;kind=k;caption=c;sort=s;}}
 static JSONObject get(String path,String token) throws Exception {
  HttpURLConnection conn=(HttpURLConnection)new URL(API+path).openConnection();
  try{
   conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(6000);conn.setReadTimeout(6000);conn.setRequestProperty("Authorization","Bearer "+token);conn.setRequestProperty("Cache-Control","no-cache");
   int code=conn.getResponseCode();
   if(code==401)throw new Exception("위젯 연결이 해제됐어요. 새 연결 코드를 등록해 주세요.");
   if(code!=200)throw new Exception("일정 연결 실패 · 새로고침해 주세요.");
   try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
    byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1){out.write(buffer,0,n);if(out.size()>2000000)throw new Exception("일정 데이터가 너무 많아요.");}
    return new JSONObject(out.toString("UTF-8"));
   }
  }finally{conn.disconnect();}
 }
 static String pair(String code) throws Exception {
  HttpURLConnection conn=(HttpURLConnection)new URL(API+"/widget/pair").openConnection();
  try{conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(6000);conn.setReadTimeout(6000);conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");
   byte[] bytes=new JSONObject().put("code",code).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
   try(OutputStream out=conn.getOutputStream()){out.write(bytes);}
   int status=conn.getResponseCode();
   if(status!=200)throw new Exception(status==401?"코드가 만료됐거나 아직 연결되지 않았어요. 잠시 후 재시도하거나 새 코드를 받아 주세요.":"위젯 연결 코드를 확인해 주세요. 서버 코드도 최신 버전이어야 해요.");
   try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[1024];int n;while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>4096)throw new Exception("응답 오류");}
    String token=new JSONObject(out.toString("UTF-8")).optString("deviceToken");if(!token.matches("[A-Za-z0-9_-]{43}"))throw new Exception("위젯 연결 결과를 확인해 주세요.");return token;}
  }finally{conn.disconnect();}
 }
 static void disconnect(Context c,String token){if(token.isEmpty())return;try{
  HttpURLConnection conn=(HttpURLConnection)new URL(API+"/widget/disconnect").openConnection();try{conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(5000);conn.setReadTimeout(5000);conn.setRequestMethod("POST");conn.setRequestProperty("Authorization","Bearer "+token);conn.getResponseCode();}finally{conn.disconnect();}
 }catch(Exception ignored){}}
 static void sync(Context c,String token) throws Exception {
  JSONObject all=get("/widget/feed",token);
  if(!(all.opt("school") instanceof JSONArray)||!(all.opt("academy") instanceof JSONArray))throw new Exception("조회 전용 위젯 서버를 확인해 주세요.");
  all.put("at",Instant.now().toString());Vault.put(c,"cache",all.toString());c.getSharedPreferences("river-state",0).edit().remove("error").apply();
 }
 static List<Row> rows(Context c){
  List<Row> academy=new ArrayList<>(),school=new ArrayList<>();Instant now=Instant.now();
  try{
   JSONObject cache=new JSONObject(Vault.get(c,"cache"));JSONArray aa=cache.optJSONArray("academy"),ss=cache.optJSONArray("school");
   if(aa!=null)for(int i=0;i<aa.length();i++){JSONObject x=aa.getJSONObject(i);String start=x.optString("start"),id=x.optString("id");
    if(!validId(id)||!Schedule.academyVisible(x.optString("status"),start,now))continue;
    String kind=x.optString("kind"),name="과학".equals(kind)?"과학":"바디PT",type=x.optString("subtype","수업");
    if("연습".equals(type))type="클리닉";
    String round="클리닉".equals(type)?"클리닉":x.optString("round","");
    String status=Schedule.academyStatus(start,now);
    Row r=new Row(id,"lesson",name+" "+round+" · "+Schedule.lessonTime(start)+" · "+status,start);
    r.subject=name;r.title=status;r.detail=round.isEmpty()?status:round+" · "+status;
    r.date=Schedule.lessonDate(start);r.time=Schedule.lessonClock(start);academy.add(r);
   }
   if(ss!=null)for(int i=0;i<ss.length();i++){JSONObject x=ss.getJSONObject(i);String due=x.optString("due"),id=x.optString("id");
    if(!validId(id)||(!Schedule.schoolVisible(x.optString("status"),due,now)||!WidgetStyle.schoolStatus(c,x.optString("status"))))continue;
    JSONArray subjects=x.optJSONArray("subjects");String subject=subjects!=null&&subjects.length()>0?subjects.optString(0):"학교";
    Row r=new Row(id,"task",subject+" · "+x.optString("title","할 일")+" · "+Schedule.dueTime(due),due);r.subject=subject;r.subjectColor=x.optJSONObject("subjectColors")==null?"default":x.optJSONObject("subjectColors").optString(subject,"default");r.title=x.optString("title","할 일");r.due=Schedule.dueTime(due);school.add(r);
   }
  }catch(Exception ignored){}
  academy.sort(Comparator.comparing((Row x)->OffsetDateTime.parse(x.sort).toInstant()).thenComparing(x->x.id));int limit=WidgetStyle.academyLimit(c);if(academy.size()>limit)academy=new ArrayList<>(academy.subList(0,limit));school.sort(Comparator.comparing(x->x.sort));academy.addAll(school);return academy;
 }
 static boolean validId(String id){return id!=null&&id.matches("[a-fA-F0-9-]{32,36}");}
 static void error(Context c,String message){c.getSharedPreferences("river-state",0).edit().putString("error",message).apply();}
 static String error(Context c){return c.getSharedPreferences("river-state",0).getString("error","");}
 static String updated(Context c){try{return new JSONObject(Vault.get(c,"cache")).optString("at");}catch(Exception e){return "";}}
 private Data(){}
}