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
 private void outline(View view){
  android.graphics.drawable.GradientDrawable border=new android.graphics.drawable.GradientDrawable();border.setColor(Color.TRANSPARENT);border.setStroke(dp(1),Color.rgb(132,156,171));border.setCornerRadius(dp(8));view.setBackground(border);view.setPadding(dp(10),dp(6),dp(10),dp(6));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(4);view.setLayoutParams(lp);
 }
 private void pinState(Button button,boolean connected){button.setEnabled(connected);button.setAlpha(connected?1f:.35f);}
 private void flatButton(Button b){
  b.setStateListAnimator(null);b.setElevation(0);b.setTranslationZ(0);b.setAllCaps(false);b.setTextColor(Color.rgb(35,72,94));
  android.graphics.drawable.GradientDrawable normal=new android.graphics.drawable.GradientDrawable();normal.setColor(Color.rgb(228,238,243));normal.setCornerRadius(dp(8));
  b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(Color.argb(60,25,121,159)),normal,null));
  b.setPadding(dp(12),dp(10),dp(12),dp(10));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(6);b.setLayoutParams(lp);
 }

 private void addUpdateSection(LinearLayout root){
  final TextView version=text("현재 버전 · "+BuildConfig.VERSION_NAME,12);root.addView(version);
  final LinearLayout section=new LinearLayout(this);section.setOrientation(LinearLayout.VERTICAL);section.setVisibility(View.GONE);root.addView(section);
  final TextView available=text("",13);section.addView(available);
  final Button update=new Button(this);update.setText("Update");flatButton(update);update.setTextColor(Color.rgb(189,53,76));section.addView(update);
  section.addView(text("기존 앱을 삭제하지 말고 업데이트하세요. 설치가 차단되면 다운로드에 사용한 브라우저 또는 내 파일의 ‘이 출처 허용’을 켜주세요. 설치 후 다시 꺼도 됩니다. 다른 보안 경고가 뜨면 해당 안내를 확인하세요.",12));
  new Thread(()->{
   try{
    final UpdateRelease release=UpdateRelease.load();
    runOnUiThread(()->{
     if(isFinishing()||isDestroyed())return;
     if(!release.newerThan(BuildConfig.VERSION_CODE))return;
     available.setText("새 버전 · "+release.version);section.setVisibility(View.VISIBLE);
     update.setOnClickListener(v->{
      try{startActivity(new Intent(Intent.ACTION_VIEW,android.net.Uri.parse(release.url)));}
      catch(ActivityNotFoundException e){Toast.makeText(this,"다운로드할 브라우저를 확인해 주세요.",Toast.LENGTH_LONG).show();}
     });
    });
   }catch(Exception e){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())version.setText("현재 버전 · "+BuildConfig.VERSION_NAME+" · 업데이트 확인 실패");});}
  },"river-update-check").start();
 }

 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);setIntent(intent);recreate();
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
  setResult(RESULT_CANCELED);
  ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(20));scroll.setBackgroundColor(Color.rgb(245,249,252));scroll.addView(root);setContentView(scroll);
  scroll.setOnApplyWindowInsetsListener((v,insets)->{root.setPadding(dp(20),dp(24)+insets.getSystemWindowInsetTop(),dp(20),dp(20)+insets.getSystemWindowInsetBottom());return insets;});
  root.addView(text("CHOI RIVER 위젯",24));root.addView(text("학원 일정 · 오늘부터 2주 학교 할 일",16));
  root.addView(text("노션 위젯관리에 등록한 학생 연결코드를 입력해 주세요. 웹에서도 같은 코드로 연결합니다.",14));
  password=new EditText(this);password.setSingleLine(true);password.setHint("학생 연결코드");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);password.setTextSize(16);password.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);root.addView(password);
  Button connect=new Button(this);connect.setText("연결하기");
  Button pin=new Button(this);pin.setText("위젯 추가");pin.setOnClickListener(v->{if(Vault.get(this,"access").isEmpty()){status.setText("먼저 위젯 연결 코드를 등록해 주세요.");return;}AppWidgetManager m=AppWidgetManager.getInstance(this);if(m.isRequestPinAppWidgetSupported())m.requestPinAppWidget(new ComponentName(this,RiverWidget.class),null,null);else status.setText("홈 화면 빈 공간 길게 누르기 → 위젯 → CHOI RIVER에서 추가해 주세요.");});
  LinearLayout connectionButtons=new LinearLayout(this);connectionButtons.setOrientation(LinearLayout.HORIZONTAL);root.addView(connectionButtons);
  for(Button button:new Button[]{connect,pin}){flatButton(button);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(6),dp(2),0);connectionButtons.addView(button,lp);}pinState(pin,!Vault.get(this,"access").isEmpty());
  status=text(Vault.get(this,"access").isEmpty()?"연결 안 됨 · 연결 코드를 입력해 주세요.":"연결됨 · 이 기기에 위젯 연결이 저장되어 있어요.",13);root.addView(status);
  root.addView(text("코드를 입력한 뒤 연결하기를 눌러 주세요. 이미 연결되어 있으면 코드를 다시 입력하지 않아도 됩니다.",12));
  root.addView(text("위젯 모양",18));
  final TextView fontLabel=text("글자 크기 · "+WidgetStyle.font(this),14);root.addView(fontLabel);
  final SeekBar fontSize=new SeekBar(this);fontSize.setMax(6);fontSize.setProgress(WidgetStyle.font(this)-12);root.addView(fontSize);
  fontSize.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){fontLabel.setText("글자 크기 · "+(n+12));}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  root.addView(text("배경색",14));final Spinner background=new Spinner(this);background.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"그린","블랙","스카이블루"}){
   private View option(int position){TextView t=text(getItem(position)+"  ▾",16);t.setPadding(dp(14),dp(12),dp(14),dp(12));t.setTextColor(position==2?Color.BLACK:Color.WHITE);android.graphics.drawable.GradientDrawable bg=new android.graphics.drawable.GradientDrawable();bg.setColor(Color.parseColor(position==0?"#286F49":position==1?"#0C0C0C":"#FAF6DA"));bg.setCornerRadius(dp(8));t.setBackground(bg);return t;}
   @Override public View getView(int position,View convert,android.view.ViewGroup parent){return option(position);}
   @Override public View getDropDownView(int position,View convert,android.view.ViewGroup parent){return option(position);}
  });background.setSelection(WidgetStyle.theme(this));outline(background);root.addView(background);
  final TextView transparencyLabel=text("배경 투명도 · "+WidgetStyle.transparency(this)+"%",14);root.addView(transparencyLabel);
  final SeekBar transparency=new SeekBar(this);transparency.setMax(80);transparency.setProgress(WidgetStyle.transparency(this));root.addView(transparency);
  transparency.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){transparencyLabel.setText("배경 투명도 · "+n+"%");}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  root.addView(text("학원 일정 표시 개수",14));final Spinner count=new Spinner(this);count.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"3개  ▾","6개  ▾","9개  ▾"}));count.setSelection(WidgetStyle.academyLimit(this)/3-1);outline(count);root.addView(count);
  root.addView(text("학교 일정 표시 상태",14));final CheckBox showStart=new CheckBox(this);showStart.setText("시작 전");showStart.setChecked(WidgetStyle.schoolStatus(this,"시작전"));outline(showStart);final CheckBox showProgress=new CheckBox(this);showProgress.setText("진행 중");showProgress.setChecked(WidgetStyle.schoolStatus(this,"진행 중"));outline(showProgress);LinearLayout stateButtons=new LinearLayout(this);stateButtons.setOrientation(LinearLayout.HORIZONTAL);root.addView(stateButtons);for(CheckBox box:new CheckBox[]{showStart,showProgress}){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(4),dp(2),0);stateButtons.addView(box,lp);}
  Button applyStyle=new Button(this);applyStyle.setText("설정 저장");
  final TextView styleResult=text("",12);root.addView(styleResult);
  applyStyle.setOnClickListener(v->{WidgetStyle.saveFilters(this,(count.getSelectedItemPosition()+1)*3,showStart.isChecked(),showProgress.isChecked());WidgetStyle.save(this,fontSize.getProgress()+12,background.getSelectedItemPosition(),transparency.getProgress());if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID)setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));styleResult.setText("홈 화면 위젯에 적용했어요.");});
  Button clear=new Button(this);clear.setText("연결 해제");
  clear.setOnClickListener(v->{if(busy)return;try{final String disconnectToken=Vault.get(this,"access");new Thread(()->Data.disconnect(getApplicationContext(),disconnectToken),"river-widget-disconnect").start();Vault.put(this,"access",null);Vault.put(this,"cache",null);Data.error(this,"");RiverWidget.renderAll(this);pinState(pin,false);status.setText("위젯 연결을 해제했어요.");}catch(Exception e){status.setText("연결 해제에 실패했어요.");}});
  Button close=new Button(this);close.setText("닫기");close.setOnClickListener(v->finish());
  LinearLayout buttons=new LinearLayout(this);buttons.setOrientation(LinearLayout.HORIZONTAL);root.addView(buttons);
  for(Button button:new Button[]{applyStyle,clear,close}){flatButton(button);button.setTextSize(12);button.setMinWidth(0);button.setMinimumWidth(0);button.setPadding(dp(3),dp(10),dp(3),dp(10));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(6),dp(2),0);buttons.addView(button,lp);}
  addUpdateSection(root);
  root.addView(text("자동 갱신은 약 30분 간격이며 휴대폰 절전 상태에 따라 늦어질 수 있어요. ↻를 누르면 새로 불러와요. 항목을 누르면 기존 사이트가 열려요.",12));
  connect.setOnClickListener(v->{
   if(busy)return;final String typed=password.getText().toString().trim();final String saved=Vault.get(this,"access");if(typed.isEmpty()&&saved.isEmpty()){status.setText("학생 연결코드를 입력해 주세요.");return;}
   busy=true;connect.setEnabled(false);pinState(pin,false);clear.setEnabled(false);status.setText("학원·학교 일정을 연결하고 있어요…");
   new Thread(()->{String failure=null;try{String value=typed.isEmpty()?saved:Data.pair(typed,saved);Vault.put(getApplicationContext(),"access",value);Data.sync(getApplicationContext(),value);}catch(Exception e){failure=e.getMessage();}
    final String error=failure;runOnUiThread(()->{if(isDestroyed())return;busy=false;connect.setEnabled(true);pinState(pin,!Vault.get(this,"access").isEmpty());clear.setEnabled(true);
     if(error!=null){status.setText(error);return;}password.setText("");RiverWidget.renderAll(this);status.setText("연결됨 · 학원·학교 일정을 불러왔어요.");Toast.makeText(this,"위젯 연결 완료",Toast.LENGTH_SHORT).show();
     if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID){RiverWidget.render(this,AppWidgetManager.getInstance(this),widgetId);setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));}
    });
   },"river-widget-connect").start();
  });
 }
}
