package kr.co.marihome.riverwidget;
import android.app.job.*;
import android.content.*;
public class SyncJob extends JobService {
 static void request(Context c){
  if(Vault.get(c,"access").isEmpty())return;
  JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
  scheduler.schedule(new JobInfo.Builder(3101,new ComponentName(c,SyncJob.class)).setMinimumLatency(1).setOverrideDeadline(1000).build());
 }
 @Override public boolean onStartJob(JobParameters params){new Thread(()->{
  try{String token=Vault.get(this,"access");if(!token.isEmpty())Data.sync(this,token);}
  catch(Exception e){Data.error(this,e.getMessage()==null?"일정 새로고침 실패":e.getMessage());}
  RiverWidget.renderAll(this);jobFinished(params,false);
 },"river-widget-sync").start();return true;}
 @Override public boolean onStopJob(JobParameters params){return true;}
}