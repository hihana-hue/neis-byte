package kr.co.marihome.riverwidget;
import android.content.*;
import android.view.View;
import android.widget.*;
import android.util.TypedValue;
import java.util.*;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.text.style.RelativeSizeSpan;
import android.graphics.Typeface;
public class RiverListService extends RemoteViewsService {
 @Override public RemoteViewsFactory onGetViewFactory(Intent intent){return new Factory(getApplicationContext());}
 static class Factory implements RemoteViewsFactory {
  final Context c;List<List<Data.Row>> groups=new ArrayList<>();Factory(Context c){this.c=c;}
  public void onCreate(){}public void onDestroy(){groups.clear();}
  public void onDataSetChanged(){groups.clear();List<Data.Row> batch=null;for(Data.Row row:Data.rows(c)){if("lesson".equals(row.kind)){if(batch==null||batch.size()==3){batch=new ArrayList<>();groups.add(batch);}batch.add(row);}else{batch=null;groups.add(Collections.singletonList(row));}}}
  public int getCount(){return groups.size();}public long getItemId(int p){return p;}public boolean hasStableIds(){return false;}public int getViewTypeCount(){return 2;}public RemoteViews getLoadingView(){return null;}
  void text(RemoteViews v,int id,String value,boolean secondary){v.setTextViewText(id,value);v.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,WidgetStyle.font(c));v.setTextColor(id,secondary?WidgetStyle.secondary(c):WidgetStyle.text(c));}
  public RemoteViews getViewAt(int p){
   if(p<0||p>=groups.size())return null;List<Data.Row> rows=groups.get(p);boolean academy="lesson".equals(rows.get(0).kind);
   RemoteViews v=new RemoteViews(c.getPackageName(),academy?R.layout.widget_academy:R.layout.widget_row);
   v.setImageViewResource(R.id.panel_background,WidgetStyle.panel(c,academy));v.setInt(R.id.panel_background,"setImageAlpha",Math.round((100-WidgetStyle.transparency(c))*2.55f));
   v.setOnClickFillInIntent(R.id.row,new Intent());v.setOnClickFillInIntent(R.id.panel_background,new Intent());
   if(academy){int[] cells={R.id.cell0,R.id.cell1,R.id.cell2},labels={R.id.label0,R.id.label1,R.id.label2},dates={R.id.date0,R.id.date1,R.id.date2},times={R.id.time0,R.id.time1,R.id.time2},details={R.id.detail0,R.id.detail1,R.id.detail2},alarms={R.id.alarm0,R.id.alarm1,R.id.alarm2};
    for(int i=0;i<3;i++){v.setViewVisibility(cells[i],i<rows.size()?View.VISIBLE:View.INVISIBLE);if(i>=rows.size())continue;Data.Row row=rows.get(i);text(v,labels[i],row.subject,false);String heading=row.subject+(row.auxiliary.isEmpty()?"":" "+row.auxiliary);SpannableString styled=new SpannableString(heading);styled.setSpan(new StyleSpan(Typeface.BOLD),0,row.subject.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);if(!row.auxiliary.isEmpty())styled.setSpan(new RelativeSizeSpan((float)Math.max(10,WidgetStyle.font(c)-1)/WidgetStyle.font(c)),row.subject.length(),heading.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);v.setTextViewText(labels[i],styled);text(v,details[i],row.detail,false);v.setViewVisibility(details[i],row.detail.isEmpty()?View.GONE:View.VISIBLE);v.setTextViewTextSize(details[i],TypedValue.COMPLEX_UNIT_SP,Math.max(10,WidgetStyle.font(c)-1));text(v,dates[i],row.date,false);text(v,times[i],row.time,false);for(int textId:new int[]{labels[i],details[i],dates[i],times[i]})v.setTextColor(textId,WidgetStyle.academyText(c));v.setViewVisibility(alarms[i],row.today?View.VISIBLE:View.GONE);v.setContentDescription(cells[i],row.subject+" "+row.auxiliary+" "+row.date+" "+row.time+(row.today?" 오늘 일정":""));v.setOnClickFillInIntent(cells[i],new Intent());}
   }else{Data.Row row=rows.get(0);text(v,R.id.subject,row.subject,true);v.setInt(R.id.subject,"setBackgroundResource",SubjectPalette.drawable(row.subjectColor));v.setTextColor(R.id.subject,SubjectPalette.foreground(row.subjectColor));v.setTextViewTextSize(R.id.subject,TypedValue.COMPLEX_UNIT_SP,12);text(v,R.id.caption,row.title,false);text(v,R.id.due,row.due,true);v.setViewVisibility(R.id.due_alarm,row.today?View.VISIBLE:View.GONE);v.setInt(R.id.panel_background,"setColorFilter",WidgetStyle.divider(c));v.setInt(R.id.panel_background,"setImageAlpha",255);v.setTextViewTextSize(R.id.due,TypedValue.COMPLEX_UNIT_SP,WidgetStyle.font(c)-1);v.setContentDescription(R.id.row,row.subject+" "+row.title+" "+row.due+(row.today?" 오늘 마감":""));v.setOnClickFillInIntent(R.id.row,new Intent());}
   return v;
  }
 }
}
