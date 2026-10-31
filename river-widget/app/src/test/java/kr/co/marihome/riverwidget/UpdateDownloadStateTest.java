package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import android.app.DownloadManager;
public class UpdateDownloadStateTest {
 @Test public void opensOnlyCompletedNewerDownload(){assertTrue(UpdateDownloadState.canOpen(DownloadManager.STATUS_SUCCESSFUL,43,42));for(int state:new int[]{DownloadManager.STATUS_PENDING,DownloadManager.STATUS_RUNNING,DownloadManager.STATUS_PAUSED,DownloadManager.STATUS_FAILED,-1})assertFalse(UpdateDownloadState.canOpen(state,43,42));assertFalse(UpdateDownloadState.canOpen(DownloadManager.STATUS_SUCCESSFUL,42,42));assertFalse(UpdateDownloadState.canOpen(DownloadManager.STATUS_SUCCESSFUL,41,42));}
 @Test public void progressHandlesUnknownAndClamps(){assertEquals(-1,UpdateDownloadState.percent(0,-1));assertEquals(-1,UpdateDownloadState.percent(0,0));assertEquals(0,UpdateDownloadState.percent(-1,100));assertEquals(50,UpdateDownloadState.percent(50,100));assertEquals(100,UpdateDownloadState.percent(110,100));}
}
