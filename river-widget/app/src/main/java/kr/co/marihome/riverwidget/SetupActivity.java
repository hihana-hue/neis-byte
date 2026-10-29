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
 private int widgetId=AppWidgetManager.INVALID_APPWIDGET_ID;private boolean busy=false;private TextView status;private TextView screenTitle;private Spinner designSpinner;private EditText password;
 private TextView updateDownloadStatus;private Button openDownloadedUpdate;private Button updateButton;private boolean resumed=false,receiverRegistered=false;private long openedDownload=-1;
 private final BroadcastReceiver updateReceiver=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent intent){long id=getPreferences(0).getLong("updateDownload",-1);if(DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())&&id>=0&&intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID,-2)==id)checkDownloadedUpdate(true);}};

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
  b.setMinHeight(dp(44));b.setMinimumHeight(dp(44));b.setPadding(dp(5),dp(2),dp(5),dp(2));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(6);b.setLayoutParams(lp);
 }

 private void addUpdateSection(LinearLayout root){
  final TextView version=text("현재 버전 · "+BuildConfig.VERSION_NAME+" · 업데이트 확인 중…",12);root.addView(version);
  final LinearLayout section=new LinearLayout(this);section.setOrientation(LinearLayout.VERTICAL);section.setVisibility(View.GONE);root.addView(section);
  final TextView available=text("",13);section.addView(available);
  final Button update=new Button(this);updateButton=update;update.setText("Update");flatButton(update);update.setTextColor(Color.rgb(189,53,76));section.addView(update);
  section.addView(text("1. 업데이트할 때: 기존 앱은 삭제하지 마세요.",12));
  section.addView(text("2. 보안 위험 자동 차단으로 막힐 때: 설정 → 보안 및 개인정보 보호 → 보안 위험 자동 차단 끄기",12));
  section.addView(text("3. 출처 허용을 요청할 때: 설치에 사용한 앱의 ‘이 출처 허용’ 켜기",12));
  section.addView(text("4. APK를 열었을 때: ‘업데이트’ 누르기",12));
  section.addView(text("5. 설치가 끝났을 때: 보안 위험 자동 차단 다시 켜기 · 출처 허용 끄기",12));
  updateDownloadStatus=text("",12);root.addView(updateDownloadStatus);
  openDownloadedUpdate=new Button(this);openDownloadedUpdate.setText("설치 파일 열기");flatButton(openDownloadedUpdate);openDownloadedUpdate.setVisibility(View.GONE);openDownloadedUpdate.setOnClickListener(v->openDownloadedUpdate());root.addView(openDownloadedUpdate);
  checkDownloadedUpdate(false);
  new Thread(()->{
   try{
    final UpdateRelease release=UpdateRelease.load();
    runOnUiThread(()->{
     if(isFinishing()||isDestroyed())return;
     version.setText("현재 버전 · "+BuildConfig.VERSION_NAME+(release.newerThan(BuildConfig.VERSION_CODE)?"":" · 최신 버전입니다."));
     if(!release.newerThan(BuildConfig.VERSION_CODE))return;
     available.setText("새 버전 · "+release.version);section.setVisibility(View.VISIBLE);
     update.setOnClickListener(v->{
      try{
       if(getPreferences(0).getLong("updateDownload",-1)>=0&&downloadState(getPreferences(0).getLong("updateDownload",-1))==DownloadManager.STATUS_SUCCESSFUL){openDownloadedUpdate();return;}
       android.net.Uri uri=android.net.Uri.parse(release.url);
       DownloadManager manager=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);
       DownloadManager.Request request=new DownloadManager.Request(uri);
       request.setTitle("마리 에듀 "+release.version+" 업데이트");
       request.setMimeType("application/vnd.android.package-archive");
       request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
       String name="MARI-EDU-Widget-"+release.version+"-"+release.code+"-"+System.currentTimeMillis()+".apk";
       if(android.os.Build.VERSION.SDK_INT>=29)request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS,name);
       else request.setDestinationInExternalFilesDir(this,android.os.Environment.DIRECTORY_DOWNLOADS,name);
       long id=manager.enqueue(request);getPreferences(0).edit().putLong("updateDownload",id).putInt("updateTarget",release.code).apply();openedDownload=-1;
       updateDownloadStatus.setText("다운로드 중 · 완료되면 설치 화면을 엽니다.");update.setEnabled(false);
       Toast.makeText(this,"다운로드를 시작했어요.",Toast.LENGTH_SHORT).show();
      }catch(Exception e){Toast.makeText(this,"다운로드를 시작하지 못했어요. 인터넷 연결과 다운로드 관리자를 확인해 주세요.",Toast.LENGTH_LONG).show();}
     });
    });
   }catch(Exception e){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())version.setText("현재 버전 · "+BuildConfig.VERSION_NAME+" · 업데이트 확인 실패");});}
  },"river-update-check").start();
 }

 private int downloadState(long id){
  DownloadManager manager=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);
  try(android.database.Cursor cursor=manager.query(new DownloadManager.Query().setFilterById(id))){if(cursor!=null&&cursor.moveToFirst())return cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));}catch(Exception ignored){}return -1;
 }
 private void checkDownloadedUpdate(boolean autoOpen){
  if(updateDownloadStatus==null||openDownloadedUpdate==null)return;
  long id=getPreferences(0).getLong("updateDownload",-1);int target=getPreferences(0).getInt("updateTarget",0);
  if(id<0)return;
  if(target<=BuildConfig.VERSION_CODE){getPreferences(0).edit().remove("updateDownload").remove("updateTarget").apply();openDownloadedUpdate.setVisibility(View.GONE);updateDownloadStatus.setText("");return;}
  int state=downloadState(id);
  if(state==DownloadManager.STATUS_SUCCESSFUL){updateDownloadStatus.setText("다운로드 완료 · 설치 파일 열기를 눌러 업데이트하세요.");openDownloadedUpdate.setVisibility(View.VISIBLE);if(autoOpen&&resumed&&openedDownload!=id)openDownloadedUpdate();}
  else if(state==DownloadManager.STATUS_FAILED||state==-1){updateDownloadStatus.setText("다운로드 파일을 확인하지 못했어요. Update를 다시 눌러 주세요.");getPreferences(0).edit().remove("updateDownload").apply();openDownloadedUpdate.setVisibility(View.GONE);if(updateButton!=null)updateButton.setEnabled(true);}
  else updateDownloadStatus.setText("다운로드 중 · 완료 후 설치 파일 열기를 눌러 주세요.");
 }
 private void openDownloadedUpdate(){
  long id=getPreferences(0).getLong("updateDownload",-1);if(id<0||downloadState(id)!=DownloadManager.STATUS_SUCCESSFUL){checkDownloadedUpdate(false);return;}
  try{
   if(!getPackageManager().canRequestPackageInstalls()){
    updateDownloadStatus.setText("이 앱의 ‘이 출처 허용’을 켠 뒤 돌아와 설치 파일 열기를 눌러 주세요. 설치 후 다시 꺼 주세요.");
    startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,android.net.Uri.parse("package:"+getPackageName())));return;
   }
   DownloadManager manager=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);android.net.Uri uri=manager.getUriForDownloadedFile(id);if(uri==null)throw new java.io.IOException("파일 없음");
   Intent install=new Intent(Intent.ACTION_VIEW);install.setDataAndType(uri,"application/vnd.android.package-archive");install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);install.setClipData(ClipData.newRawUri("업데이트 APK",uri));startActivity(install);openedDownload=id;
  }catch(Exception e){updateDownloadStatus.setText("설치 화면을 열지 못했어요. 내 파일 → 다운로드에서 MARI-EDU APK를 여세요. 차단되면 보안 위험 자동 차단을 잠시 끄고 설치 후 다시 켜 주세요.");}
 }
 // Android 12 and older have no exported/not-exported receiver flags. Only our saved, successful download ID is accepted.
 @android.annotation.SuppressLint("UnspecifiedRegisterReceiverFlag")
 private void registerLegacyDownloadReceiver(IntentFilter filter){registerReceiver(updateReceiver,filter);}
 @Override protected void onResume(){super.onResume();resumed=true;if(!receiverRegistered){IntentFilter filter=new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);if(android.os.Build.VERSION.SDK_INT>=33)registerReceiver(updateReceiver,filter,Context.RECEIVER_EXPORTED);else registerLegacyDownloadReceiver(filter);receiverRegistered=true;}checkDownloadedUpdate(false);}
 @Override protected void onPause(){resumed=false;super.onPause();}
 @Override protected void onDestroy(){if(receiverRegistered){unregisterReceiver(updateReceiver);receiverRegistered=false;}super.onDestroy();}

 private void fillDesigns(){
  org.json.JSONArray designs=WidgetDesign.list(this);java.util.List<String> names=new java.util.ArrayList<>();for(int i=0;i<designs.length();i++)names.add(designs.optJSONObject(i).optString("name"));
  int selected=WidgetDesign.selectedIndex(this);
  designSpinner.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,names){
   private View option(int position){org.json.JSONObject design=WidgetDesign.list(SetupActivity.this).optJSONObject(position);TextView t=text(getItem(position)+"  ▾",16);int bg=Color.parseColor(design.optString("background","#286F49"));t.setTextColor(Color.luminance(bg)>.45?Color.BLACK:Color.WHITE);android.graphics.drawable.GradientDrawable shape=new android.graphics.drawable.GradientDrawable();shape.setColor(bg);shape.setCornerRadius(dp(8));t.setBackground(shape);t.setPadding(dp(12),dp(8),dp(12),dp(8));return t;}
   @Override public View getView(int position,View convert,android.view.ViewGroup parent){return option(position);}
   @Override public View getDropDownView(int position,View convert,android.view.ViewGroup parent){return option(position);}
  });
  if(selected>=0)designSpinner.setSelection(selected);else{designSpinner.setSelection(-1);if(status!=null)status.setText("선택한 디자인이 목록에서 없어져 마지막 디자인을 유지합니다. 새 디자인을 선택해 주세요.");}
 }
 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);setIntent(intent);recreate();
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
  setResult(RESULT_CANCELED);
  ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(20));scroll.setBackgroundColor(Color.rgb(245,249,252));scroll.addView(root);setContentView(scroll);
  scroll.setOnApplyWindowInsetsListener((v,insets)->{root.setPadding(dp(20),dp(24)+insets.getSystemWindowInsetTop(),dp(20),dp(20)+insets.getSystemWindowInsetBottom());return insets;});
  screenTitle=text(Data.widgetTitle(this),24);root.addView(screenTitle);root.addView(text("학원 일정 · 오늘부터 2주 학교 할 일",16));
  addUpdateSection(root);
  root.addView(text("노션 위젯관리에 등록한 학생 연결코드를 입력해 주세요. 웹에서도 같은 코드로 연결합니다.",14));
  password=new EditText(this);password.setSingleLine(true);password.setHint("학생 연결코드");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);password.setTextSize(16);password.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);root.addView(password);
  Button connect=new Button(this);connect.setText("연결하기");
  Button pin=new Button(this);pin.setText("위젯 추가");pin.setOnClickListener(v->{if(Vault.get(this,"access").isEmpty()){status.setText("먼저 위젯 연결 코드를 등록해 주세요.");return;}AppWidgetManager m=AppWidgetManager.getInstance(this);if(m.isRequestPinAppWidgetSupported())m.requestPinAppWidget(new ComponentName(this,RiverWidget.class),null,null);else status.setText("홈 화면 빈 공간 길게 누르기 → 위젯 → CHOI RIVER에서 추가해 주세요.");});
  Button refresh=new Button(this);refresh.setText("새로고침");
  LinearLayout connectionButtons=new LinearLayout(this);connectionButtons.setOrientation(LinearLayout.HORIZONTAL);root.addView(connectionButtons);
  for(Button button:new Button[]{connect,pin,refresh}){flatButton(button);button.setTextSize(12);button.setMinWidth(0);button.setMinimumWidth(0);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(6),dp(2),0);connectionButtons.addView(button,lp);}pinState(pin,!Vault.get(this,"access").isEmpty());
  status=text(Vault.get(this,"access").isEmpty()?"연결 안 됨 · 연결 코드를 입력해 주세요.":"연결됨 · 이 기기에 위젯 연결이 저장되어 있어요.",13);root.addView(status);
  root.addView(text("코드를 입력한 뒤 연결하기를 눌러 주세요. 이미 연결되어 있으면 코드를 다시 입력하지 않아도 됩니다.",12));
  root.addView(text("위젯 모양",18));
  final TextView titleFontLabel=text("제목 글자 크기 · "+WidgetStyle.titleFont(this)+" (기본 18)",14);root.addView(titleFontLabel);
  final SeekBar titleFontSize=new SeekBar(this);titleFontSize.setMax(12);titleFontSize.setProgress(WidgetStyle.titleFont(this)-12);root.addView(titleFontSize);
  titleFontSize.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){titleFontLabel.setText("제목 글자 크기 · "+(n+12)+" (기본 18)");}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  final TextView fontLabel=text("글자 크기 · "+WidgetStyle.font(this),14);root.addView(fontLabel);
  final SeekBar fontSize=new SeekBar(this);fontSize.setMax(6);fontSize.setProgress(WidgetStyle.font(this)-12);root.addView(fontSize);
  fontSize.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){fontLabel.setText("글자 크기 · "+(n+12));}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  root.addView(text("디자인",14));designSpinner=new Spinner(this);fillDesigns();outline(designSpinner);root.addView(designSpinner);
  root.addView(text("디자인은 처음 연결하거나 여기서 새로고침할 때만 불러옵니다.",12));
  root.addView(text("학원 일정 표시 개수",14));final Spinner count=new Spinner(this);count.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"3개  ▾","6개  ▾","9개  ▾"}));count.setSelection(WidgetStyle.academyLimit(this)/3-1);outline(count);root.addView(count);
  root.addView(text("학교 일정 표시 상태",14));final CheckBox showStart=new CheckBox(this);showStart.setText("시작 전");showStart.setChecked(WidgetStyle.schoolStatus(this,"시작전"));outline(showStart);final CheckBox showProgress=new CheckBox(this);showProgress.setText("진행 중");showProgress.setChecked(WidgetStyle.schoolStatus(this,"진행 중"));outline(showProgress);LinearLayout stateButtons=new LinearLayout(this);stateButtons.setOrientation(LinearLayout.HORIZONTAL);root.addView(stateButtons);for(CheckBox box:new CheckBox[]{showStart,showProgress}){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(4),dp(2),0);stateButtons.addView(box,lp);}
  Button applyStyle=new Button(this);applyStyle.setText("설정 저장");
  final TextView styleResult=text("",12);root.addView(styleResult);
  applyStyle.setOnClickListener(v->{WidgetStyle.saveTitleFont(this,titleFontSize.getProgress()+12);WidgetStyle.saveFilters(this,(count.getSelectedItemPosition()+1)*3,showStart.isChecked(),showProgress.isChecked());int position=designSpinner.getSelectedItemPosition();org.json.JSONObject design=WidgetDesign.list(this).optJSONObject(position);if(design!=null&&!WidgetDesign.choose(this,design.optString("id"))){styleResult.setText("디자인을 저장하지 못했어요. 다시 시도해 주세요.");return;}WidgetStyle.save(this,fontSize.getProgress()+12,WidgetStyle.theme(this),0);if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID)setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));styleResult.setText("홈 화면 위젯에 적용했어요.");});
  Button clear=new Button(this);clear.setText("연결 해제");
  clear.setOnClickListener(v->{if(busy)return;try{final String disconnectToken=Vault.get(this,"access");new Thread(()->Data.disconnect(getApplicationContext(),disconnectToken),"river-widget-disconnect").start();Vault.put(this,"access",null);Vault.put(this,"cache",null);Data.error(this,"");RiverWidget.renderAll(this);pinState(pin,false);screenTitle.setText("나의 일정");status.setText("위젯 연결을 해제했어요.");}catch(Exception e){status.setText("연결 해제에 실패했어요.");}});
  Button close=new Button(this);close.setText("닫기");close.setOnClickListener(v->finish());
  LinearLayout buttons=new LinearLayout(this);buttons.setOrientation(LinearLayout.HORIZONTAL);root.addView(buttons);
  for(Button button:new Button[]{applyStyle,clear,close}){flatButton(button);button.setTextSize(12);button.setMinWidth(0);button.setMinimumWidth(0);button.setPadding(dp(3),dp(10),dp(3),dp(10));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(2),dp(6),dp(2),0);buttons.addView(button,lp);}
  root.addView(text("자동 갱신은 약 30분 간격이며 휴대폰 절전 상태에 따라 늦어질 수 있어요. ↻를 누르면 새로 불러와요. 항목을 누르면 기존 사이트가 열려요.",12));
  refresh.setOnClickListener(v->{
   if(busy)return;String token=Vault.get(this,"access");if(token.isEmpty()){status.setText("먼저 학생코드를 연결해 주세요.");return;}
   busy=true;refresh.setEnabled(false);connect.setEnabled(false);pinState(pin,false);clear.setEnabled(false);status.setText("일정과 디자인 새로고침 중…");
   new Thread(()->{String message;try{Data.sync(getApplicationContext(),token);Data.syncDesigns(getApplicationContext(),token);message="일정·디자인을 새로 불러왔어요.";}catch(Exception e){message="기존 디자인 유지 · "+e.getMessage();}
    final String result=message;runOnUiThread(()->{if(isDestroyed())return;busy=false;refresh.setEnabled(true);connect.setEnabled(true);pinState(pin,!Vault.get(this,"access").isEmpty());clear.setEnabled(true);screenTitle.setText(Data.widgetTitle(this));fillDesigns();RiverWidget.renderAll(this);status.setText(result);});
   },"river-design-refresh").start();
  });
  connect.setOnClickListener(v->{
   if(busy)return;final String typed=password.getText().toString().trim();final String saved=Vault.get(this,"access");if(typed.isEmpty()&&saved.isEmpty()){status.setText("학생 연결코드를 입력해 주세요.");return;}
   busy=true;connect.setEnabled(false);pinState(pin,false);clear.setEnabled(false);status.setText("학원·학교 일정을 연결하고 있어요…");
   new Thread(()->{String failure=null;String designWarning="";try{String value=typed.isEmpty()?saved:Data.pair(typed,saved);Vault.put(getApplicationContext(),"access",value);Data.sync(getApplicationContext(),value);try{Data.syncDesigns(getApplicationContext(),value);}catch(Exception designError){designWarning=designError.getMessage();}}catch(Exception e){failure=e.getMessage();}
    final String warning=designWarning;final String error=failure;runOnUiThread(()->{if(isDestroyed())return;busy=false;connect.setEnabled(true);pinState(pin,!Vault.get(this,"access").isEmpty());clear.setEnabled(true);
     if(error!=null){status.setText(error);return;}password.setText("");screenTitle.setText(Data.widgetTitle(this));fillDesigns();RiverWidget.renderAll(this);status.setText("연결됨 · 학원·학교 일정을 불러왔어요."+(warning.isEmpty()?"":"\n"+warning));Toast.makeText(this,"위젯 연결 완료",Toast.LENGTH_SHORT).show();
     if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID){RiverWidget.render(this,AppWidgetManager.getInstance(this),widgetId);setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));}
    });
   },"river-widget-connect").start();
  });
 }
}

