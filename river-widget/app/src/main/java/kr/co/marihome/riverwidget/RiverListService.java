package kr.co.marihome.riverwidget;
import android.content.*;
import android.widget.*;
import java.util.*;
public class RiverListService extends RemoteViewsService {
 @Override public RemoteViewsFactory onGetViewFactory(Intent intent){return new Factory(getApplicationContext());}
 static class Factory implements RemoteViewsFactory {
  final Context c;List<Data.Row> rows=new ArrayList<>();Factory(Context c){this.c=c;}
  public void onCreate(){}public void onDestroy(){rows.clear();}public void onDataSetChanged(){rows=Data.rows(c);}
  public int getCount(){return rows.size();}public long getItemId(int position){return position;}public boolean hasStableIds(){return false;}public int getViewTypeCount(){return 1;}public RemoteViews getLoadingView(){return null;}
  public RemoteViews getViewAt(int position){
   if(position<0||position>=rows.size())return null;Data.Row row=rows.get(position);RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget_row);
   v.setTextViewText(R.id.marker,"lesson".equals(row.kind)?"◷":"·");v.setTextViewText(R.id.caption,row.caption);
   v.setOnClickFillInIntent(R.id.row,new Intent().putExtra("kind",row.kind).putExtra("id",row.id));return v;
  }
 }
}