package kr.co.marihome.riverwidget;
import android.app.Activity;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
public class OpenTaskActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);String kind=getIntent().getStringExtra("kind"),id=getIntent().getStringExtra("id");
  Uri.Builder uri=Uri.parse("https://www.marihome.co.kr/river/").buildUpon();
  if(Data.validId(id)&&("lesson".equals(kind)||"task".equals(kind)))uri.appendQueryParameter(kind,id);
  try{startActivity(new Intent(Intent.ACTION_VIEW,uri.build()));}catch(ActivityNotFoundException ignored){}
  finish();
 }
}