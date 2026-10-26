package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class UpdateReleaseTest {
 private final String url="https://www.marihome.co.kr/river/downloads/CHOI-RIVER-Widget-1.28.apk";
 @Test public void buttonOnlyForReadyNewerVersion(){assertTrue(new UpdateRelease(true,27,"1.26",url).newerThan(26));assertFalse(new UpdateRelease(true,27,"1.26",url).newerThan(27));assertFalse(new UpdateRelease(true,27,"1.26",url).newerThan(28));assertFalse(new UpdateRelease(false,27,"1.26",url).newerThan(26));}
 @Test public void onlyDirectOwnedReleaseApks(){assertTrue(UpdateRelease.allowedUrl(url));for(String bad:new String[]{"https://github.com/hihana-hue/neis-byte/releases","https://evil.example/app.apk",url+"?redirect=evil",url+"#x",url.replace("https:","http:"),url.replace("www.marihome.co.kr/","www.marihome.co.kr.evil.example/"),url.replace("/river/downloads/","/other/")})assertFalse(bad,UpdateRelease.allowedUrl(bad));}
}
