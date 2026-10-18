package kr.co.marihome.riverwidget;
import android.app.Activity;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
public class OpenTaskActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);
  try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://www.marihome.co.kr/river/")));}catch(ActivityNotFoundException ignored){}
  finish();
 }
}
