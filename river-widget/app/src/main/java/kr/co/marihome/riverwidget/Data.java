package kr.co.marihome.riverwidget;
import android.content.Context;
import org.json.*;
import java.net.*;
import java.io.*;
import java.time.*;
import java.util.*;
final class Data {
 static final String API="https://choi-river-notion.hihana77.workers.dev";
 static final class Row {boolean today=false;String auxiliary="";String id,kind,caption,sort,subject="",subjectColor="default",title="",due="",date="",time="",detail="";Row(String i,String k,String c,String s){id=i;kind=k;caption=c;sort=s;}}
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
 static String pair(String code,String existingToken) throws Exception {
  HttpURLConnection conn=(HttpURLConnection)new URL(API+"/widget/pair").openConnection();
  try{conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(6000);conn.setReadTimeout(6000);conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");
   byte[] bytes=new JSONObject().put("code",code).put("mode","student").put("deviceToken",existingToken).put("deviceName",android.os.Build.MANUFACTURER+" "+android.os.Build.MODEL).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
   try(OutputStream out=conn.getOutputStream()){out.write(bytes);}
   int status=conn.getResponseCode();
   if(status!=200){String message="";try(InputStream in=conn.getErrorStream()){if(in!=null){byte[] buf=new byte[4096];int n=in.read(buf);if(n>0)message=new JSONObject(new String(buf,0,n,java.nio.charset.StandardCharsets.UTF_8)).optString("error","");}}catch(Exception ignored){}if(!message.isEmpty())throw new Exception(message);throw new Exception(status==401?"연결코드가 틀렸거나 학생 연결이 중지됐어요.":"학생 연결 서버를 확인해 주세요. 서버도 최신 버전이어야 해요.");}
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
    String kind=x.optString("kind"),name=academyName(kind),type=x.optString("subtype","수업");
    if("연습".equals(type))type="클리닉";
    String round="클리닉".equals(type)?"(클)":x.optString("round","");if(!"(클)".equals(round)&&!round.matches("[1-9][0-9]*/[1-9][0-9]*"))round="";
    String status=Schedule.academyStatus(start,now);if("예정".equals(status))status="";
    Row r=new Row(id,"lesson",name+" "+round+" · "+Schedule.lessonTime(start)+" · "+status,start);
    r.subject=name;r.auxiliary=round;r.title=status;r.detail="";r.today=Schedule.isToday(start,now,true);
    r.date=Schedule.lessonDate(start);r.time=Schedule.lessonClock(start);academy.add(r);
   }
   if(ss!=null)for(int i=0;i<ss.length();i++){JSONObject x=ss.getJSONObject(i);String due=x.optString("due"),id=x.optString("id");
    if(!validId(id)||(!Schedule.schoolVisible(x.optString("status"),due,now)||!WidgetStyle.schoolStatus(c,x.optString("status"))))continue;
    JSONArray subjects=x.optJSONArray("subjects");String subject=subjects!=null&&subjects.length()>0?subjects.optString(0):"학교";
    Row r=new Row(id,"task",subject+" · "+x.optString("title","할 일")+" · "+Schedule.dueTime(due),due);r.subject=subject;r.subjectColor=x.optJSONObject("subjectColors")==null?NotionSubjects.fallback(subject):x.optJSONObject("subjectColors").optString(subject,NotionSubjects.fallback(subject));r.title=x.optString("title","할 일");r.today=Schedule.isToday(due,now,false);r.due=Schedule.dueTime(due);school.add(r);
   }
  }catch(Exception ignored){}
  academy.sort(Comparator.comparing((Row x)->OffsetDateTime.parse(x.sort).toInstant()).thenComparing(x->x.id));int limit=WidgetStyle.academyLimit(c);if(academy.size()>limit)academy=new ArrayList<>(academy.subList(0,limit));school.sort(Comparator.comparing(x->x.sort));
  try{JSONObject cache=new JSONObject(Vault.get(c,"cache"));if(!cache.optBoolean("academyConnected",true)){
   int start=0,progress=0,today=0;JSONArray all=cache.optJSONArray("school");if(all!=null)for(int i=0;i<all.length();i++){JSONObject x=all.getJSONObject(i);String due=x.optString("due"),status=x.optString("status");if(!Schedule.schoolVisible(status,due,now))continue;if("시작전".equals(status)||"시작 전".equals(status))start++;else progress++;if(Schedule.isToday(due,now,false))today++;}
   String[] names={"시작 전","진행 중","오늘 마감"};int[] values={start,progress,today};for(int i=0;i<3;i++){Row summary=new Row("summary"+i,"summary",names[i]+" "+values[i],"");summary.subject=names[i];summary.date=String.valueOf(values[i]);academy.add(summary);}
  }}catch(Exception ignored){}
  academy.addAll(school);return academy;
 }
 static String academyName(String kind){return "운동".equals(kind)?"바디PT":kind==null||kind.trim().isEmpty()?"일정":kind;}
 static boolean validId(String id){return id!=null&&id.matches("[a-fA-F0-9-]{32,36}");}
 static void error(Context c,String message){c.getSharedPreferences("river-state",0).edit().putString("error",message).apply();}
 static String error(Context c){return c.getSharedPreferences("river-state",0).getString("error","");}
 static String widgetTitle(Context c){try{JSONObject cache=new JSONObject(Vault.get(c,"cache"));JSONObject student=cache.optJSONObject("student");if(student!=null){String title=student.optString("widgetTitle","").trim(),name=student.optString("name","").trim();if(!title.isEmpty()&&!"CHOI RIVER 포레버".equals(title)&&!title.equals(name+"의 일정"))return title;if(!name.isEmpty())return name+" Fighting";}}catch(Exception ignored){}return "나의 일정";}
 static String updated(Context c){try{return new JSONObject(Vault.get(c,"cache")).optString("at");}catch(Exception e){return "";}}
 private Data(){}
}