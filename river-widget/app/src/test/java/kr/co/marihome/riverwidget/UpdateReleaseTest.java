package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class UpdateReleaseTest {
 private final String url="https://github.com/hihana-hue/neis-byte/releases/download/widget-1.26/CHOI-RIVER-Widget-1.26.apk";
 @Test public void buttonOnlyForReadyNewerVersion(){assertTrue(new UpdateRelease(true,27,"1.26",url).newerThan(26));assertFalse(new UpdateRelease(true,27,"1.26",url).newerThan(27));assertFalse(new UpdateRelease(true,27,"1.26",url).newerThan(28));assertFalse(new UpdateRelease(false,27,"1.26",url).newerThan(26));}
 @Test public void onlyDirectOwnedReleaseApks(){assertTrue(UpdateRelease.allowedUrl(url));for(String bad:new String[]{"https://github.com/hihana-hue/neis-byte/releases","https://evil.example/app.apk",url+"?redirect=evil",url+"#x",url.replace("https:","http:"),url.replace("github.com/","github.com.evil.example/"),url.replace("hihana-hue","other-owner")})assertFalse(bad,UpdateRelease.allowedUrl(bad));}
}
