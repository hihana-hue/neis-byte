package kr.co.marihome.riverwidget;
import android.app.DownloadManager;
final class UpdateDownloadState {
 static boolean canOpen(int state,int target,int installed){return state==DownloadManager.STATUS_SUCCESSFUL&&target>installed;}
 static int percent(long done,long total){if(total<=0)return -1;return (int)Math.round(Math.max(0d,Math.min(1d,(double)done/total))*100d);}
 private UpdateDownloadState(){}
}
