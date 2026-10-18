package kr.co.marihome.riverwidget;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.net.Uri;
import android.widget.RemoteViews;
public class RiverWidget extends AppWidgetProvider {
 static final String REFRESH="kr.co.marihome.riverwidget.REFRESH";
 @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);if(REFRESH.equals(intent.getAction())){renderAll(c);SyncJob.request(c);}}
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){for(int id:ids)render(c,manager,id);SyncJob.request(c);}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){render(c,m,id);}
 static void renderAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);int[] ids=m.getAppWidgetIds(new ComponentName(c,RiverWidget.class));for(int id:ids)render(c,m,id);m.notifyAppWidgetViewDataChanged(ids,R.id.list);}
 static void render(Context c,AppWidgetManager m,int id){
  RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget);
  Intent adapter=new Intent(c,RiverListService.class);adapter.setData(Uri.parse("river-widget://list/"+id));v.setRemoteAdapter(R.id.list,adapter);v.setEmptyView(R.id.list,R.id.empty);
  boolean configured=!Vault.get(c,"access").isEmpty();String error=Data.error(c);
  v.setTextViewText(R.id.empty,!configured?"⚙ 위젯 연결 코드를 등록해 주세요.":!error.isEmpty()?error:"이번 주 예정된 학원·학교 할 일이 없어요.");
  v.setTextViewText(R.id.heading,!error.isEmpty()?"학원 · 이번 주 할 일 · 갱신 필요":"학원 · 이번 주 할 일");
  v.setOnClickPendingIntent(R.id.refresh,PendingIntent.getBroadcast(c,id,new Intent(c,RiverWidget.class).setAction(REFRESH),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  v.setOnClickPendingIntent(R.id.settings,PendingIntent.getActivity(c,id,new Intent(c,SetupActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  v.setOnClickPendingIntent(R.id.heading,PendingIntent.getActivity(c,id+10000,new Intent(c,OpenTaskActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  Intent open=new Intent(c,OpenTaskActivity.class);open.setData(Uri.parse("river-widget://open/"+id));
  v.setPendingIntentTemplate(R.id.list,PendingIntent.getActivity(c,id+20000,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE));
  m.updateAppWidget(id,v);
 }
}