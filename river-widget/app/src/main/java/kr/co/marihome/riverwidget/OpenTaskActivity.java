package kr.co.marihome.riverwidget;
import android.app.Activity;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
public class OpenTaskActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);
  try{Uri.Builder url=Uri.parse("https://www.marihome.co.kr/river/").buildUpon();try{org.json.JSONObject student=new org.json.JSONObject(Vault.get(this,"cache")).optJSONObject("student");if(student!=null)url.appendQueryParameter("student",student.optString("id"));}catch(Exception ignored){}startActivity(new Intent(Intent.ACTION_VIEW,url.build()));}catch(ActivityNotFoundException ignored){}
  finish();
 }
}

