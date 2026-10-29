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
  public void onDataSetChanged(){groups.clear();List<Data.Row> batch=null;for(Data.Row row:Data.rows(c)){if("lesson".equals(row.kind)||"summary".equals(row.kind)){if(batch==null||batch.size()==3){batch=new ArrayList<>();groups.add(batch);}batch.add(row);}else{batch=null;groups.add(Collections.singletonList(row));}}}
  public int getCount(){return groups.size();}public long getItemId(int p){return p;}public boolean hasStableIds(){return false;}public int getViewTypeCount(){return 2;}public RemoteViews getLoadingView(){return null;}
  void text(RemoteViews v,int id,String value,boolean secondary){v.setTextViewText(id,value);v.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,WidgetStyle.font(c));v.setTextColor(id,secondary?WidgetStyle.secondary(c):WidgetStyle.text(c));}
  public RemoteViews getViewAt(int p){
   if(p<0||p>=groups.size())return null;List<Data.Row> rows=groups.get(p);boolean academy="lesson".equals(rows.get(0).kind)||"summary".equals(rows.get(0).kind);
   RemoteViews v=new RemoteViews(c.getPackageName(),academy?R.layout.widget_academy:R.layout.widget_row);
   v.setImageViewResource(R.id.panel_background,WidgetStyle.panel(c,academy));if(academy)v.setInt(R.id.panel_background,"setColorFilter",WidgetDesign.color(c,"academyBackground",0xFF307852));v.setInt(R.id.panel_background,"setImageAlpha",255);v.setInt(R.id.row,"setBackgroundColor",academy?android.graphics.Color.TRANSPARENT:WidgetDesign.color(c,"schoolBackground",android.graphics.Color.TRANSPARENT));
   v.setOnClickFillInIntent(R.id.row,new Intent());v.setOnClickFillInIntent(R.id.panel_background,new Intent());
   if(academy){int lessons=0;for(List<Data.Row> group:groups)for(Data.Row item:group)if("lesson".equals(item.kind))lessons++;boolean nextLesson=p+1<groups.size()&&"lesson".equals(groups.get(p+1).get(0).kind);int bottom=LayoutRules.academyBottom(lessons,nextLesson);v.setViewPadding(R.id.row,0,0,0,Math.round(bottom*c.getResources().getDisplayMetrics().density));for(int separator:new int[]{R.id.academy_separator1,R.id.academy_separator2}){v.setInt(separator,"setColorFilter",WidgetDesign.color(c,"separator",0xFFFFFFFF));v.setInt(separator,"setImageAlpha",WidgetDesign.separatorAlpha(c));}int[] cells={R.id.cell0,R.id.cell1,R.id.cell2},labels={R.id.label0,R.id.label1,R.id.label2},dates={R.id.date0,R.id.date1,R.id.date2},times={R.id.time0,R.id.time1,R.id.time2},details={R.id.detail0,R.id.detail1,R.id.detail2},alarms={R.id.alarm0,R.id.alarm1,R.id.alarm2},kindIcons={R.id.kind0,R.id.kind1,R.id.kind2};
    v.setViewVisibility(R.id.academy_separator1,rows.size()>1&&"lesson".equals(rows.get(0).kind)?View.VISIBLE:View.INVISIBLE);v.setViewVisibility(R.id.academy_separator2,rows.size()>2&&"lesson".equals(rows.get(0).kind)?View.VISIBLE:View.INVISIBLE);
    for(int i=0;i<3;i++){v.setViewVisibility(cells[i],i<rows.size()?View.VISIBLE:View.INVISIBLE);if(i>=rows.size())continue;Data.Row row=rows.get(i);text(v,labels[i],row.subject,false);String heading=row.subject+(row.auxiliary.isEmpty()?"":" "+row.auxiliary);SpannableString styled=new SpannableString(heading);styled.setSpan(new StyleSpan(WidgetDesign.bold(c,"academyBold")?Typeface.BOLD:Typeface.NORMAL),0,row.subject.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);if(!row.auxiliary.isEmpty())styled.setSpan(new RelativeSizeSpan((float)Math.max(10,WidgetStyle.font(c)-1)/WidgetStyle.font(c)),row.subject.length(),heading.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);v.setTextViewText(labels[i],styled);text(v,details[i],row.detail,false);v.setViewVisibility(details[i],row.detail.isEmpty()?View.GONE:View.VISIBLE);v.setTextViewTextSize(details[i],TypedValue.COMPLEX_UNIT_SP,Math.max(10,WidgetStyle.font(c)-1));text(v,dates[i],row.date,false);text(v,times[i],row.time,false);v.setViewVisibility(times[i],"summary".equals(row.kind)?View.GONE:View.VISIBLE);for(int textId:new int[]{labels[i],details[i],dates[i],times[i]})v.setTextColor(textId,WidgetStyle.academyText(c));v.setViewVisibility(alarms[i],row.today?View.VISIBLE:View.GONE);v.setInt(alarms[i],"setColorFilter",WidgetDesign.color(c,"today",0xFFC83F50));AcademyIcons.render(c,v,kindIcons[i],"lesson".equals(row.kind)?AcademyIcons.selected(c,row.subject):"");v.setContentDescription(cells[i],row.subject+" "+row.auxiliary+" "+row.date+" "+row.time+(row.today?" 오늘 일정":""));v.setOnClickFillInIntent(cells[i],new Intent());}
   }else{Data.Row row=rows.get(0);text(v,R.id.subject,row.subject,true);v.setInt(R.id.subject,"setBackgroundResource",SubjectPalette.drawable(row.subjectColor));v.setTextColor(R.id.subject,SubjectPalette.foreground(row.subjectColor));v.setTextViewTextSize(R.id.subject,TypedValue.COMPLEX_UNIT_SP,12);text(v,R.id.caption,row.title,false);text(v,R.id.due,row.due,true);v.setViewVisibility(R.id.due_alarm,row.today?View.VISIBLE:View.GONE);v.setInt(R.id.due_alarm,"setColorFilter",WidgetDesign.color(c,"today",0xFFC83F50));v.setInt(R.id.panel_background,"setColorFilter",WidgetStyle.divider(c));v.setInt(R.id.panel_background,"setImageAlpha",255);v.setTextViewTextSize(R.id.due,TypedValue.COMPLEX_UNIT_SP,WidgetStyle.font(c)-1);v.setContentDescription(R.id.row,row.subject+" "+row.title+" "+row.due+(row.today?" 오늘 마감":""));v.setOnClickFillInIntent(R.id.row,new Intent());}
   return v;
  }
 }
}

