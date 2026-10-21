package kr.co.marihome.riverwidget;
import android.app.*;
import android.appwidget.*;
import android.os.Bundle;
import android.content.*;
import android.graphics.Color;
import android.text.InputType;
import android.view.*;
import android.widget.*;
public class SetupActivity extends Activity {
 private int widgetId=AppWidgetManager.INVALID_APPWIDGET_ID;private boolean busy=false;private TextView status;private EditText password;
 private int dp(int value){return (int)(value*getResources().getDisplayMetrics().density+.5f);}
 private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.rgb(35,72,94));t.setPadding(0,dp(5),0,dp(5));return t;}
 private void flatButton(Button b){
  b.setStateListAnimator(null);b.setElevation(0);b.setTranslationZ(0);b.setAllCaps(false);b.setTextColor(Color.rgb(35,72,94));
  android.graphics.drawable.GradientDrawable normal=new android.graphics.drawable.GradientDrawable();normal.setColor(Color.rgb(228,238,243));normal.setCornerRadius(dp(8));
  b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(Color.argb(60,25,121,159)),normal,null));
  b.setPadding(dp(12),dp(10),dp(12),dp(10));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(6);b.setLayoutParams(lp);
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
  setResult(RESULT_CANCELED);
  ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(20));scroll.setBackgroundColor(Color.rgb(245,249,252));scroll.addView(root);setContentView(scroll);
  scroll.setOnApplyWindowInsetsListener((v,insets)->{root.setPadding(dp(20),dp(24)+insets.getSystemWindowInsetTop(),dp(20),dp(20)+insets.getSystemWindowInsetBottom());return insets;});
  root.addView(text("CHOI RIVER 위젯",24));root.addView(text("학원 먼저 · 이번 주 학교 할 일",16));
  root.addView(text("사이트 상단 설정 → 홈 화면 위젯 연결에서 코드를 만든 뒤 입력해 주세요. 사이트 암호나 노션 토큰은 입력하지 않아요.",14));
  password=new EditText(this);password.setSingleLine(true);password.setHint("위젯 연결 코드 · XXXX-XXXX-XXXX");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);password.setTextSize(16);password.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);root.addView(password);
  root.addView(text("위젯 모양",18));
  final TextView fontLabel=text("글자 크기 · "+WidgetStyle.font(this),14);root.addView(fontLabel);
  final SeekBar fontSize=new SeekBar(this);fontSize.setMax(6);fontSize.setProgress(WidgetStyle.font(this)-12);root.addView(fontSize);
  fontSize.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){fontLabel.setText("글자 크기 · "+(n+12));}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  root.addView(text("배경색",14));final Spinner background=new Spinner(this);background.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"그린","블랙","스카이블루"}){
   private View option(int position){TextView t=text(getItem(position),16);t.setPadding(dp(14),dp(12),dp(14),dp(12));t.setTextColor(position==2?Color.BLACK:Color.WHITE);android.graphics.drawable.GradientDrawable bg=new android.graphics.drawable.GradientDrawable();bg.setColor(Color.parseColor(position==0?"#286F49":position==1?"#0C0C0C":"#FAF6DA"));bg.setCornerRadius(dp(8));t.setBackground(bg);return t;}
   @Override public View getView(int position,View convert,android.view.ViewGroup parent){return option(position);}
   @Override public View getDropDownView(int position,View convert,android.view.ViewGroup parent){return option(position);}
  });background.setSelection(WidgetStyle.theme(this));root.addView(background);
  final TextView transparencyLabel=text("배경 투명도 · "+WidgetStyle.transparency(this)+"%",14);root.addView(transparencyLabel);
  final SeekBar transparency=new SeekBar(this);transparency.setMax(80);transparency.setProgress(WidgetStyle.transparency(this));root.addView(transparency);
  transparency.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){transparencyLabel.setText("배경 투명도 · "+n+"%");}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  root.addView(text("학원 일정 표시 개수",14));final Spinner count=new Spinner(this);count.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"3개","6개","9개"}));count.setSelection(WidgetStyle.academyLimit(this)/3-1);root.addView(count);
  root.addView(text("학교 일정 표시 상태",14));final CheckBox showStart=new CheckBox(this);showStart.setText("시작 전");showStart.setChecked(WidgetStyle.schoolStatus(this,"시작전"));root.addView(showStart);final CheckBox showProgress=new CheckBox(this);showProgress.setText("진행 중");showProgress.setChecked(WidgetStyle.schoolStatus(this,"진행 중"));root.addView(showProgress);
  Button applyStyle=new Button(this);applyStyle.setText("모양 적용 · 다시 설치할 필요 없어요");root.addView(applyStyle);
  final TextView styleResult=text("",12);root.addView(styleResult);
  applyStyle.setOnClickListener(v->{WidgetStyle.saveFilters(this,(count.getSelectedItemPosition()+1)*3,showStart.isChecked(),showProgress.isChecked());WidgetStyle.save(this,fontSize.getProgress()+12,background.getSelectedItemPosition(),transparency.getProgress());styleResult.setText("홈 화면 위젯에 적용했어요.");});
  Button connect=new Button(this);connect.setText(Vault.get(this,"access").isEmpty()?"연결하고 위젯 준비":"저장된 연결로 위젯 사용");root.addView(connect);
  status=text(Vault.get(this,"access").isEmpty()?"아직 연결되지 않았어요.":"이 기기에 조회 전용 연결이 저장되어 있어요. ↻ 새로고침하거나 홈 화면에서 위젯을 추가해 주세요.",13);root.addView(status);
  Button pin=new Button(this);pin.setText("홈 화면에 위젯 추가");root.addView(pin);pin.setOnClickListener(v->{if(Vault.get(this,"access").isEmpty()){status.setText("먼저 위젯 연결 코드를 등록해 주세요.");return;}AppWidgetManager m=AppWidgetManager.getInstance(this);if(m.isRequestPinAppWidgetSupported())m.requestPinAppWidget(new ComponentName(this,RiverWidget.class),null,null);else status.setText("홈 화면 빈 공간 길게 누르기 → 위젯 → CHOI RIVER에서 추가해 주세요.");});
  Button clear=new Button(this);clear.setText("이 기기의 위젯 연결 해제");root.addView(clear);
  clear.setOnClickListener(v->{if(busy)return;try{final String disconnectToken=Vault.get(this,"access");new Thread(()->Data.disconnect(getApplicationContext(),disconnectToken),"river-widget-disconnect").start();Vault.put(this,"access",null);Vault.put(this,"cache",null);Data.error(this,"");RiverWidget.renderAll(this);status.setText("위젯 연결을 해제했어요.");}catch(Exception e){status.setText("연결 해제에 실패했어요.");}});
  root.addView(text("자동 갱신은 약 30분 간격이며 휴대폰 절전 상태에 따라 늦어질 수 있어요. ↻를 누르면 새로 불러와요. 항목을 누르면 기존 사이트가 열려요.",12));
  for(Button button:new Button[]{applyStyle,connect,pin,clear})flatButton(button);
  connect.setOnClickListener(v->{
   if(busy)return;final String typed=password.getText().toString().trim();final String saved=Vault.get(this,"access");if(typed.isEmpty()&&saved.isEmpty()){status.setText("메인 대시보드에서 만든 위젯 연결 코드를 입력해 주세요.");return;}
   busy=true;connect.setEnabled(false);pin.setEnabled(false);clear.setEnabled(false);status.setText("학원·학교 일정을 연결하고 있어요…");
   new Thread(()->{String failure=null;try{String value=typed.isEmpty()?saved:Data.pair(typed);Vault.put(getApplicationContext(),"access",value);Data.sync(getApplicationContext(),value);}catch(Exception e){failure=e.getMessage();}
    final String error=failure;runOnUiThread(()->{if(isDestroyed())return;busy=false;connect.setEnabled(true);pin.setEnabled(true);clear.setEnabled(true);
     if(error!=null){status.setText(error);return;}password.setText("");RiverWidget.renderAll(this);status.setText("연결됐어요. 홈 화면에 위젯을 추가해 주세요.");
     if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID){RiverWidget.render(this,AppWidgetManager.getInstance(this),widgetId);setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));finish();}
    });
   },"river-widget-connect").start();
  });
 }
}