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
 @Override public void onCreate(Bundle state){
  super.onCreate(state);widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
  setResult(RESULT_CANCELED);
  ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(20));scroll.setBackgroundColor(Color.rgb(245,249,252));scroll.addView(root);setContentView(scroll);
  scroll.setOnApplyWindowInsetsListener((v,insets)->{root.setPadding(dp(20),dp(24)+insets.getSystemWindowInsetTop(),dp(20),dp(20)+insets.getSystemWindowInsetBottom());return insets;});
  root.addView(text("CHOI RIVER 위젯",24));root.addView(text("학원 먼저 · 이번 주 학교 할 일",16));
  root.addView(text("반투명 3×1 크기예요. 목록 안에서 위아래로 스크롤할 수 있어요. 학원은 지난 일정도 출석 처리 전까지 남아요.",14));
  root.addView(text("기존 사이트 접근 암호를 한 번 연결해 주세요. 노션 토큰은 입력하지 않아요.",14));
  password=new EditText(this);password.setSingleLine(true);password.setHint("사이트 접근 암호");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);password.setTextSize(16);password.setAutofillHints(View.AUTOFILL_HINT_PASSWORD);root.addView(password);
  Button connect=new Button(this);connect.setText("연결하고 위젯 준비");root.addView(connect);
  status=text(Vault.get(this,"access").isEmpty()?"아직 연결되지 않았어요.":"이 기기에 암호가 저장되어 있어요. ↻ 새로고침하거나 홈 화면에서 위젯을 추가해 주세요.",13);root.addView(status);
  Button pin=new Button(this);pin.setText("홈 화면에 위젯 추가");root.addView(pin);pin.setOnClickListener(v->{if(Vault.get(this,"access").isEmpty()){status.setText("먼저 접근 암호를 연결해 주세요.");return;}AppWidgetManager m=AppWidgetManager.getInstance(this);if(m.isRequestPinAppWidgetSupported())m.requestPinAppWidget(new ComponentName(this,RiverWidget.class),null,null);else status.setText("홈 화면 빈 공간 길게 누르기 → 위젯 → CHOI RIVER에서 추가해 주세요.");});
  Button clear=new Button(this);clear.setText("이 기기의 위젯 연결 해제");root.addView(clear);
  clear.setOnClickListener(v->{if(busy)return;try{Vault.put(this,"access",null);Vault.put(this,"cache",null);Data.error(this,"");RiverWidget.renderAll(this);status.setText("위젯 연결을 해제했어요.");}catch(Exception e){status.setText("연결 해제에 실패했어요.");}});
  root.addView(text("자동 갱신은 약 30분 간격이며 휴대폰 절전 상태에 따라 늦어질 수 있어요. ↻를 누르면 새로 불러와요. 항목을 누르면 기존 사이트가 열려요.",12));
  connect.setOnClickListener(v->{
   if(busy)return;String value=password.getText().toString();if(value.isEmpty()){status.setText("접근 암호를 입력해 주세요.");return;}
   busy=true;connect.setEnabled(false);pin.setEnabled(false);clear.setEnabled(false);status.setText("학원·학교 일정을 연결하고 있어요…");
   new Thread(()->{String failure=null;try{Data.sync(getApplicationContext(),value);Vault.put(getApplicationContext(),"access",value);}catch(Exception e){failure=e.getMessage();}
    final String error=failure;runOnUiThread(()->{if(isDestroyed())return;busy=false;connect.setEnabled(true);pin.setEnabled(true);clear.setEnabled(true);
     if(error!=null){status.setText(error);return;}password.setText("");RiverWidget.renderAll(this);status.setText("연결됐어요. 홈 화면에 위젯을 추가해 주세요.");
     if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID){RiverWidget.render(this,AppWidgetManager.getInstance(this),widgetId);setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));finish();}
    });
   },"river-widget-connect").start();
  });
 }
}