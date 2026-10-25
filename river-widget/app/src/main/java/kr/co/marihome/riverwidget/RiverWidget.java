package kr.co.marihome.riverwidget;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.net.Uri;
import android.widget.RemoteViews;
public class RiverWidget extends AppWidgetProvider {
 private static final java.util.concurrent.atomic.AtomicBoolean refreshing=new java.util.concurrent.atomic.AtomicBoolean();
 static final String REFRESH="kr.co.marihome.riverwidget.REFRESH";
 @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);if(REFRESH.equals(intent.getAction())){
  if(!refreshing.compareAndSet(false,true))return;
  final PendingResult pending=goAsync();final Context app=c.getApplicationContext();
  renderAll(app);
  new Thread(()->{
   String result;
   try{String token=Vault.get(app,"access");if(token.isEmpty())throw new Exception("위젯을 먼저 연결해 주세요.");Data.sync(app,token);result="일정을 새로 불러왔어요.";}
   catch(Exception e){result=e.getMessage()==null?"새로고침에 실패했어요.":e.getMessage();Data.error(app,result);}
   try{refreshing.set(false);renderAll(app);final String message=result;new android.os.Handler(android.os.Looper.getMainLooper()).post(()->android.widget.Toast.makeText(app,message,android.widget.Toast.LENGTH_SHORT).show());}
   finally{refreshing.set(false);pending.finish();}
  },"river-widget-manual-refresh").start();
 }}
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){for(int id:ids)render(c,manager,id);SyncJob.request(c);}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){render(c,m,id);}
 static void renderAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);int[] ids=m.getAppWidgetIds(new ComponentName(c,RiverWidget.class));for(int id:ids)render(c,m,id);m.notifyAppWidgetViewDataChanged(ids,R.id.list);}
 static void icon(Context c,RemoteViews views,int viewId,int resource){
  android.graphics.drawable.Drawable drawable=c.getDrawable(resource).mutate();drawable.setTint(viewId==R.id.refresh&&refreshing.get()?(WidgetStyle.theme(c)==2?android.graphics.Color.rgb(195,74,20):android.graphics.Color.rgb(255,209,70)):WidgetStyle.secondary(c));
  int pixels=Math.max(16,Math.round(16*c.getResources().getDisplayMetrics().density));
  android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(pixels,pixels,android.graphics.Bitmap.Config.ARGB_8888);
  drawable.setBounds(0,0,pixels,pixels);drawable.draw(new android.graphics.Canvas(bitmap));views.setImageViewBitmap(viewId,bitmap);
 }
 static void render(Context c,AppWidgetManager m,int id){
  RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget);
  // Only the dedicated settings icon may open configuration.
  v.setOnClickPendingIntent(R.id.root,null);
  v.setOnClickPendingIntent(android.R.id.background,null);
  v.setOnClickPendingIntent(R.id.empty,null);
  v.setImageViewResource(android.R.id.background,WidgetStyle.drawable(c));v.setInt(android.R.id.background,"setImageAlpha",Math.round((100-WidgetStyle.transparency(c))*2.55f));
  v.setTextViewTextSize(R.id.heading,android.util.TypedValue.COMPLEX_UNIT_SP,12);v.setTextViewTextSize(R.id.empty,android.util.TypedValue.COMPLEX_UNIT_SP,WidgetStyle.font(c));
  Intent adapter=new Intent(c,RiverListService.class);adapter.setData(Uri.parse("river-widget://list/"+id));v.setRemoteAdapter(R.id.list,adapter);v.setEmptyView(R.id.list,R.id.empty);
  boolean configured=!Vault.get(c,"access").isEmpty();String error=Data.error(c);
  v.setTextViewText(R.id.empty,!configured?"⚙ 위젯 연결 코드를 등록해 주세요.":!error.isEmpty()?error:"예정된 학원·앞으로 2주 학교 일정이 없어요.");
  v.setTextViewText(R.id.heading,Data.widgetTitle(c));v.setTextColor(R.id.heading,WidgetStyle.text(c));v.setTextColor(R.id.empty,WidgetStyle.secondary(c));icon(c,v,R.id.refresh,R.drawable.widget_refresh);icon(c,v,R.id.settings,R.drawable.widget_settings);
  v.setOnClickPendingIntent(R.id.refresh,PendingIntent.getBroadcast(c,id,new Intent(c,RiverWidget.class).setAction(REFRESH),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  v.setOnClickPendingIntent(R.id.settings,PendingIntent.getActivity(c,id,new Intent(c,SetupActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).setAction("kr.co.marihome.riverwidget.OPEN_SETTINGS").setData(Uri.parse("river-widget://settings/"+id)).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  v.setOnClickPendingIntent(R.id.heading,PendingIntent.getActivity(c,id+10000,new Intent(c,OpenTaskActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  Intent open=new Intent(c,OpenTaskActivity.class);open.setData(Uri.parse("river-widget://open/"+id));
  v.setPendingIntentTemplate(R.id.list,PendingIntent.getActivity(c,id+20000,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE));
  PendingIntent web=PendingIntent.getActivity(c,id+30000,new Intent(c,OpenTaskActivity.class).setData(Uri.parse("river-widget://panel/"+id)),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  v.setOnClickPendingIntent(R.id.content_panel,web);
  v.setOnClickPendingIntent(R.id.empty,web);
  m.updateAppWidget(id,v);
 }
}