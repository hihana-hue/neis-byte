package kr.co.marihome.riverwidget;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Public release metadata only. Student codes and device tokens are never sent. */
final class UpdateRelease {
 final boolean ready;final int code;final String version,url;
 UpdateRelease(boolean ready,int code,String version,String url){this.ready=ready;this.code=code;this.version=version;this.url=url;}
 boolean newerThan(int installed){return ready&&code>installed&&allowedUrl(url);}
 static boolean allowedUrl(String value){
  try{URI u=new URI(value);return "https".equals(u.getScheme())&&"www.marihome.co.kr".equals(u.getHost())&&u.getUserInfo()==null&&u.getPort()==-1&&u.getQuery()==null&&u.getFragment()==null&&u.getRawPath().matches("/river/downloads/CHOI-RIVER-Widget-[0-9.]+\\.apk");}
  catch(Exception e){return false;}
 }
 static UpdateRelease load() throws Exception {
  HttpURLConnection connection=(HttpURLConnection)new URL("https://www.marihome.co.kr/river/widget-release.json").openConnection();
  connection.setConnectTimeout(8000);connection.setReadTimeout(8000);connection.setUseCaches(false);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("Cache-Control","no-cache");
  try{
   if(connection.getResponseCode()!=200)throw new java.io.IOException("Release unavailable");
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();
   try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[1024];int n;while((n=input.read(buffer))!=-1){if(bytes.size()+n>8192)throw new java.io.IOException("Release too large");bytes.write(buffer,0,n);}}
   JSONObject json=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
   return new UpdateRelease(json.optBoolean("ready",false),json.optInt("versionCode",0),json.optString("version",""),json.optString("url",""));
  }finally{connection.disconnect();}
 }
}
